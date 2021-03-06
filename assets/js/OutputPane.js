// Display of output from currently selected module

import React from 'react'
import PropTypes from 'prop-types'
import TableView from './TableView'
import OutputIframe from './OutputIframe'
import debounce from 'debounce'
import { connect } from 'react-redux'
import { findParamValByIdName} from './utils'
import { sortDirectionNone } from './UpdateTableAction'

export class OutputPane extends React.Component {
  static propTypes = {
    api: PropTypes.object.isRequired,
    workflowId: PropTypes.number.isRequired,
    lastRelevantDeltaId: PropTypes.number.isRequired,
    selectedWfModuleId: PropTypes.number,
    isPublic: PropTypes.bool.isRequired,
    isReadOnly: PropTypes.bool.isRequired,
    showColumnLetter: PropTypes.bool.isRequired,
    sortColumn: PropTypes.string,
    sortDirection: PropTypes.number,
    htmlOutput: PropTypes.bool
  }

  constructor(props) {
    super(props);

    this.spinnerRef = React.createRef()
    this.spinning = false
  }

  // Spinner state did not work as part of component state, conditionally visible in render()
  // It didn't appear when refreshing a large table. My guess is that is because React updates are batched,
  // the spinner on and spinner off updates are combined and we never see it when the table re-render is long.
  // So, now we turn the spinner on and off immediately through direct DOM styling
  setBusySpinner = (visible) => {
    const spinnerEl = this.spinnerRef.current
    if (this.spinnerEl && visible != this.spinning) {
      this.spinnerEl.style.display = visible ? 'flex' : 'none'
      this.spinning = visible
    }
  }

  // Can't do this as an anonymous function like ref={ (el) => {this.spinnerEl=el} }
  // because el will sometimes be null if we do. See https://reactjs.org/docs/refs-and-the-dom.html#caveats
  saveSpinnerEl(el) {
    this.spinnerEl = el;
  }

  getWindowWidth() {
    return window.innerWidth
      || document.documentElement.clientWidth
      || document.body.clientWidth;
  }

  render() {
    const { isReadOnly, isPublic, sortColumn, sortDirection, showColumnLetter, lastRelevantDeltaId } = this.props

    // Make a table component even if no module ID (should still show an empty table)
    const tableView =
      <TableView
        selectedWfModuleId={this.props.selectedWfModuleId}
        lastRelevantDeltaId={lastRelevantDeltaId}
        api={this.props.api}
        setBusySpinner={this.setBusySpinner}
        isReadOnly={isReadOnly}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        showColumnLetter={showColumnLetter}
      />

    // This iframe holds the module HTML output, e.g. a visualization.
    // We leave the component around even when there is no HTML because of
    // our solution to https://www.pivotaltracker.com/story/show/159637930:
    // DataGrid.js doesn't notice the resize that occurs when the iframe
    // appears or disappears.
    const outputIFrame = (
      <OutputIframe
        visible={!!this.props.htmlOutput}
        selectedWfModuleId={this.props.selectedWfModuleId}
        workflowId={this.props.workflowId}
        isPublic={isPublic}
        lastRelevantDeltaId={lastRelevantDeltaId}
      />
    )

    // Spinner is always rendered, but we toggle 'display: none' in setBusySpinner()
    // Start hidden. TableView will turn it on when needed.
    const spinner = (
      <div
        id="spinner-container-transparent"
        style={{display:'none'}}
        ref={this.spinnerRef}
      >
        <div id="spinner-l1">
          <div id="spinner-l2">
            <div id="spinner-l3"></div>
          </div>
        </div>
      </div>
    )

    return (
      <div className='outputpane'>
        {spinner}
        {outputIFrame}
        {tableView}
      </div>
    )
  }
}

function mapStateToProps(state, ownProps) {
  const { workflow, wfModules, modules } = state
  const selectedWfModuleId = workflow.wf_modules[state.selected_wf_module || 0] || null
  const selectedWfModule = wfModules[String(selectedWfModuleId)] || null
  const selectedModule = modules[String(selectedWfModule ? selectedWfModule.module_version.module : null)] || null
  const id_name = selectedModule ? selectedModule.id_name : null

  const showColumnLetter = id_name === 'formula' || id_name === 'reorder-columns'

  let sortColumn = null
  let sortDirection = sortDirectionNone

  if (id_name === 'sort-from-table') {
    const columnParam = findParamValByIdName(selectedWfModule, 'column');
    const directionParam = findParamValByIdName(selectedWfModule, 'direction').value;

    sortColumn = columnParam && columnParam.value || null
    sortDirection = directionParam || sortDirectionNone
  }

  return {
    workflowId: workflow.id,
    lastRelevantDeltaId: selectedWfModule ? selectedWfModule.last_relevant_delta_id : null,
    selectedWfModuleId,
    isPublic: workflow.public,
    isReadOnly: workflow.read_only,
    htmlOutput: selectedWfModule ? selectedWfModule.html_output : false,
    showColumnLetter,
    sortColumn,
    sortDirection,
  }
}

export default connect(
  mapStateToProps
)(OutputPane)
