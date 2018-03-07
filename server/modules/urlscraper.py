from .moduleimpl import ModuleImpl
import pandas as pd
from server.versions import save_fetched_table_if_changed
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from django.conf import settings
import aiohttp
import asyncio


# Resolve circular import: execute -> dispatch -> urlscraper -> execute
class URLScraperExecuteCallbacks:
    execute_wfmodule = None

urlscraper_execute_callbacks = URLScraperExecuteCallbacks()


# --- Asynchornous URL scraping ---

# get or create an event loop for the current thread.
def get_thread_event_loop():
    try:
        loop = asyncio.get_event_loop()  # gets previously set event loop, if possible
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop

def is_valid_url(url):
    validate = URLValidator()
    try:
        validate(url)
        return True
    except ValidationError:
        return False

async def async_get_url(url):
    with aiohttp.Timeout(settings.SCRAPER_TIMEOUT):
        session = aiohttp.ClientSession()
        return await session.get(url)

# Parses the HTTP response object and stores it as a row in our table
def add_result_to_table(table, i, response):
    table.loc[i,'status'] = str(response['status'])
    table.loc[i,'html'] = response['text']

# Server didn't get back to us in time
def add_error_to_table(table, i, errmsg):
    table.loc[i,'status'] = errmsg
    table.loc[i,'html'] = ''

# Asynchronously scrape many urls, and store the results in the table
async def scrape_urls(urls, result_table):
    event_loop = get_thread_event_loop()

    max_fetchers = settings.SCRAPER_NUM_CONNECTIONS

    tasks_to_rows = {}  # double as our list of currently active tasks
    num_urls = len(urls)
    started_urls = 0
    finished_urls = 0

    while finished_urls < num_urls:

        # start tasks until we max out connections, or run out of urls
        while ( len(tasks_to_rows) < max_fetchers ) and ( started_urls < num_urls ):
            url = urls[started_urls]
            if is_valid_url(url):
                newtask = event_loop.create_task(async_get_url(url))
                tasks_to_rows[newtask] = started_urls
            else:
                add_error_to_table(result_table, started_urls, URLScraper.STATUS_INVALID_URL)
                finished_urls += 1
            started_urls += 1

        # Wait for any of the fetches to finish (if there are any)
        if len(tasks_to_rows) > 0:
            finished, pending = await asyncio.wait(tasks_to_rows.keys(), return_when=asyncio.FIRST_COMPLETED)

            # process any results we got
            for task in finished:
                try:
                    response = task.result()
                    add_result_to_table(result_table, tasks_to_rows[task], response)
                except asyncio.TimeoutError:
                    add_error_to_table(result_table, tasks_to_rows[task], URLScraper.STATUS_TIMEOUT)
                except aiohttp.client_exceptions.ClientConnectionError:
                    add_error_to_table(result_table, tasks_to_rows[task], URLScraper.STATUS_NO_CONNECTION)

                del tasks_to_rows[task]

            finished_urls += len(finished)



# --- URLScraper module ---

class URLScraper(ModuleImpl):
    STATUS_INVALID_URL = "Invalid URL"
    STATUS_TIMEOUT = "No response"
    STATUS_NO_CONNECTION = "Can't connect"

    @staticmethod
    def render(wf_module, table):
        urlcol = wf_module.get_param_column('urlcol')
        if urlcol != '':
            return wf_module.retrieve_fetched_table()
        else:
            return table # nop if column not set

    # Scrapy scrapy scrapy
    @staticmethod
    def event(wfm, event=None, **kwargs):

        # fetching could take a while so notify clients/users that we're working on it
        wfm.set_busy()

        # get our list of URLs from a column in the input table
        urlcol = wfm.get_param_column('urlcol')
        if urlcol == '':
            return
        prev_table = urlscraper_execute_callbacks.execute_wfmodule(wfm.previous_in_stack())

        # column parameters are not sanitized here, could be missing this col
        if urlcol in prev_table.columns:
            urls = prev_table[urlcol]

            table = pd.DataFrame({'url': urls, 'status': ''}, columns=['url', 'status', 'html'])

            event_loop = get_thread_event_loop()
            event_loop.run_until_complete(scrape_urls(urls, table))

        else:
            table = pd.DataFrame()

        wfm.set_ready(notify=False)
        save_fetched_table_if_changed(wfm, table, auto_change_version=True)








