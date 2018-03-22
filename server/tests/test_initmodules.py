# test module (re)loading
from django.test import TestCase
from server.models import ParameterVal, ParameterSpec, Module, WfModule, Workflow
from server.initmodules import load_module_from_dict
from server.tests.utils import *
import json
import copy
from cjworkbench.settings import KB_ROOT_URL

class InitmoduleTests(LoggedInTestCase):
    def setUp(self):
        super(InitmoduleTests, self).setUp()  # log in
        self.loadcsv = {
            'name': 'Load CSV',
            'id_name': 'loadcsv',
            'category': 'Sources',
            'help_url': 'http://help.com/help',
            'parameters': [
                {
                    'name': 'URL',
                    'id_name' : 'url',
                    'type': 'string',
                    'default': 'http://foo.com'
                },
                {
                    'name': 'Name',
                    'id_name': 'name',
                    'type': 'string',
                    'placeholder': 'Type in a name and hit enter'
                },
                {
                    'name': 'Fetch',
                    'id_name' : 'fetch',
                    'type': 'button',
                    'visible': False,
                    'ui-only': True
                },
                {
                    'name': 'No default',
                    'id_name': 'nodefault',
                    'type': 'string',
                    'multiline': True,
                    'derived-data' : True
                },
                {
                    'name': 'Do it checkbox',
                    'id_name': 'doitcheckbox',
                    'type': 'checkbox',
                    'default': True
                }
            ]
        }

        # a new version of LoadCSV that deletes one parameter, changes the type and order of another, and adds a new one
        # Also tests menu param
        self.loadcsv2 = {
            'name': 'Load CSV RELOADED',
            'id_name': 'loadcsv',
            'category' : 'Sources',
            'parameters': [
                {
                  'name': 'Cake type',
                  'id_name' : 'caketype',
                  'type': 'menu',
                  'menu_items' : 'Cheese|Chocolate',
                  'default' : 1
                },
                {
                  'name': 'URL',
                  'id_name': 'url',
                  'type': 'integer',
                  'default': '42'
                }
              ]
            }

        # A very barebones module to test conditional UI loading
        self.cond_ui_valid = {
            'name': 'CondUI1',
            'id_name': 'condui1',
            'category': 'Analyze',
            'parameters': [
                {
                    'name': 'cond_menu',
                    'id_name': 'cond_menu',
                    'type': 'menu',
                    'menu_items': 'cond1|cond2|cond3'
                },
                {
                    'name': 'cond_test',
                    'id_name': 'cond_test',
                    'type': 'checkbox',
                    'visible_if': {
                        'id_name': 'cond_menu',
                        'value': 'cond1|cond3'
                    }
                }
            ]
        }

        # create versions of loadcsv that have missing required elements
        self.missing_name = copy.deepcopy(self.loadcsv)
        del self.missing_name['name']

        self.missing_id_name = copy.deepcopy(self.loadcsv)
        del self.missing_id_name['id_name']

        self.missing_category = copy.deepcopy(self.loadcsv)
        del self.missing_category['category']

        self.missing_param_name = copy.deepcopy(self.loadcsv)
        del self.missing_param_name['parameters'][0]['name']

        self.missing_param_id_name = copy.deepcopy(self.loadcsv)
        del self.missing_param_id_name['parameters'][0]['id_name']

        self.missing_param_type = copy.deepcopy(self.loadcsv)
        del self.missing_param_type['parameters'][0]['type']


    def test_load_valid(self):
        self.assertEqual(len(Module.objects.all()), 0)   # we should be starting with no modules
        load_module_from_dict(self.loadcsv)

        # basic properties
        self.assertEqual(len(Module.objects.all()), 1)
        m = Module.objects.all()[0]
        self.assertEqual(m.name, 'Load CSV')
        self.assertEqual(m.id_name, 'loadcsv')
        self.assertEqual(m.help_url, 'http://help.com/help')

        # parameters
        pspecs = ParameterSpec.objects.all()
        self.assertEqual(len(pspecs), 5)

        url_spec = ParameterSpec.objects.get(id_name='url')
        self.assertEqual(url_spec.name, 'URL')
        self.assertEqual(url_spec.id_name, 'url')
        self.assertEqual(url_spec.type, ParameterSpec.STRING)
        self.assertEqual(url_spec.def_value, 'http://foo.com')
        self.assertEqual(url_spec.def_visible, True)
        self.assertEqual(url_spec.ui_only, False)
        self.assertEqual(url_spec.multiline, False)
        self.assertEqual(url_spec.derived_data, False)
        self.assertEqual(url_spec.order, 0)

        name = ParameterSpec.objects.get(id_name='name')
        self.assertEqual(name.name, 'Name')
        self.assertEqual(name.id_name, 'name')
        self.assertEqual(name.type, ParameterSpec.STRING)
        self.assertEqual(name.placeholder, 'Type in a name and hit enter')

        button_spec = ParameterSpec.objects.get(id_name='fetch')
        self.assertEqual(button_spec.name, 'Fetch')
        self.assertEqual(button_spec.id_name, 'fetch')
        self.assertEqual(button_spec.type, ParameterSpec.BUTTON)
        self.assertEqual(button_spec.def_visible, False)
        self.assertEqual(button_spec.ui_only, True)
        self.assertEqual(button_spec.order, 2)

        # check missing default has a default, and that multiline works
        nodef_spec = ParameterSpec.objects.get(id_name='nodefault')
        self.assertEqual(nodef_spec.type, ParameterSpec.STRING)
        self.assertEqual(nodef_spec.def_value, '')
        self.assertEqual(nodef_spec.multiline, True)
        self.assertEqual(nodef_spec.derived_data, True)

        # Make sure checkbox loads with correct default value
        # This tests boolean -> string conversion (JSON is boolean, def_value is string)
        cb_spec = ParameterSpec.objects.get(id_name='doitcheckbox')
        self.assertEqual(cb_spec.type, ParameterSpec.CHECKBOX)
        self.assertEqual(cb_spec.def_value, 'True')

    # we should bail when keys are missing
    def test_missing_keys(self):
        with self.assertRaises(ValueError):
            load_module_from_dict(self.missing_name)

        with self.assertRaises(ValueError):
            load_module_from_dict(self.missing_id_name)

        with self.assertRaises(ValueError):
            load_module_from_dict(self.missing_category)

        with self.assertRaises(ValueError):
            load_module_from_dict(self.missing_param_name)

        with self.assertRaises(ValueError):
            load_module_from_dict(self.missing_param_id_name)

        with self.assertRaises(ValueError):
            load_module_from_dict(self.missing_param_type)


    # checks that a new module with the same id_name overwrites the old, and parameters are fixed up
    def test_module_reload(self):
        self.assertEqual(len(Module.objects.all()), 0)   # we should be starting with no modules
        m1 = load_module_from_dict(self.loadcsv)
        url_spec1 = ParameterSpec.objects.get(id_name='url')
        button_spec1 = ParameterSpec.objects.get(id_name='fetch')

        # create wf_modules in two different workflows that reference this module
        wf1 = add_new_workflow(name='Worky')
        wfm1 = add_new_wf_module(workflow=wf1, module_version=m1, order=1)
        wf2 = add_new_workflow(name='Worky 2')
        wfm2 = add_new_wf_module(workflow=wf2, module_version=m1, order=1)

        # precondition: corresponding parameter val exists for each wfm with correct default
        # also tested in test_wfmodule.py but whatevs, won't hurt
        url_pval1 = ParameterVal.objects.get(parameter_spec=url_spec1, wf_module=wfm1)
        self.assertEqual(url_pval1.value, 'http://foo.com')
        url_pval2 = ParameterVal.objects.get(parameter_spec=url_spec1, wf_module=wfm2)
        self.assertEqual(url_pval2.value, 'http://foo.com')

        # load the revised module, check that it ends up with the same primary key
        m2 = load_module_from_dict(self.loadcsv2)
        self.assertEqual(m1.id, m2.id)

        self.assertEqual(m2.module.help_url, '')

        # button pspec should be gone
        with self.assertRaises(ParameterSpec.DoesNotExist):
            ParameterSpec.objects.get(id_name='fetch')

        # url spec should still exist with same id, new type, new order
        # existing parameterval should have new default values
        url_spec2 = ParameterSpec.objects.get(id_name='url')
        self.assertEqual(url_spec1.id, url_spec2.id)
        self.assertEqual(url_spec2.type, ParameterSpec.INTEGER)
        self.assertEqual(url_spec2.order, 1)
        url_pval1.refresh_from_db()
        self.assertEqual(url_pval1.value, '42')
        url_pval2.refresh_from_db()
        self.assertEqual(url_pval2.value, '42')

        # new Menu parameter should exist, with corresponding new values in WfModules
        menu_spec = ParameterSpec.objects.get(id_name='caketype')
        self.assertEqual(menu_spec.type, ParameterSpec.MENU)
        self.assertEqual(menu_spec.def_value, '1')
        self.assertEqual(menu_spec.def_menu_items, 'Cheese|Chocolate')
        self.assertEqual(menu_spec.order, 0)
        menu_pval1 = ParameterVal.objects.get(parameter_spec=menu_spec, wf_module=wfm1)
        self.assertEqual(menu_pval1.value, '1')
        self.assertEqual(menu_pval1.order, 0)
        menu_pval2 = ParameterVal.objects.get(parameter_spec=menu_spec, wf_module=wfm2)
        self.assertEqual(menu_pval2.value, '1')
        self.assertEqual(menu_pval1.order, 0)

    # A brief check of conditional UI, in that the JSON can be stored and retrieved correctly.
    def test_condui(self):
        self.assertEqual(len(Module.objects.all()), 0)
        load_module_from_dict(self.cond_ui_valid)
        cond_spec = ParameterSpec.objects.get(id_name='cond_test')
        cond_spec_visibility = json.loads(cond_spec.visible_if)
        self.assertEqual(cond_spec_visibility, self.cond_ui_valid['parameters'][1]['visible_if'])

        new_cond_ui = copy.deepcopy(self.cond_ui_valid)
        del new_cond_ui['parameters'][1]['visible_if']['value']
        with self.assertRaises(ValueError):
            load_module_from_dict(new_cond_ui)

        new_cond_ui['parameters'][1]['visible_if']['value'] = 'cond1|cond2'
        load_module_from_dict(new_cond_ui)
        cond_spec_new = ParameterSpec.objects.get(id_name='cond_test')
        cond_spec_visibility_new = json.loads(cond_spec_new.visible_if)
        self.assertEqual(cond_spec_visibility_new, new_cond_ui['parameters'][1]['visible_if'])



