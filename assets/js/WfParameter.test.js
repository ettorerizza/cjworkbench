import React from 'react'
import WfParameter from './WfParameter'
import { shallow } from 'enzyme'

describe('WfParameter', () => {

  var nullApi = {};
  var nullFn = () => {};

  // For testing conditional UI
  var mockGetParamMenuItems = (param_id) => {return 'Sugar|Butter||Flour'}
  var mockGetParamText = (param_id) => {return '3'}
  var visibilityCond1 = JSON.stringify({
    'id_name': 'whatever',
    'value': 'Butter|Flour'
  });
  var visibilityCond2 = JSON.stringify({
    'id_name': 'whatever',
    'value': 'Sugar'
  });

  function shallowParameter(p) {
    return shallow(
      <WfParameter
        p={p}
        wf_module_id={0}
        revision={0}
        loggedInUser={{}}
        api={nullApi}
        changeParam={nullFn}
        getParamText={mockGetParamText}
        setParamText={nullFn}
        getParamMenuItems={mockGetParamMenuItems}
        startDrag={nullFn}
        stopDrag={nullFn}        
      />);
  }

  it('Renders cell editor', () => {
    var wrapper = shallowParameter({visible: true, value: '', parameter_spec: {type:'custom', id_name:'celledits' }});
    expect(wrapper.find('CellEditor')).toHaveLength(1);
    expect(wrapper).toMatchSnapshot();
  });

  it('Renders string input field', () => {
    var wrapper = shallowParameter({visible: true, value: 'data.sfgov.org', parameter_spec: {type:'string'}});
    expect(wrapper.find('textarea')).toHaveLength(1);
    expect(wrapper).toMatchSnapshot();
  });

  // Conditional UI tests

  it('Renders a parameter when visible_if conditions are met', () => {
    var wrapper = shallowParameter({
        visible: true,
        value: 'data.sfgov.org',
        parameter_spec: {
          type: 'string',
          visible_if: visibilityCond1,
          visible_if_not: '{}'
        }
    });
    expect(wrapper.find('textarea')).toHaveLength(1);
  });

  it('Does not render a parameter when visible_if conditions are not met', () => {
    var wrapper = shallowParameter({
        visible: true,
        value: 'data.sfgov.org',
        parameter_spec: {
          type: 'string',
          visible_if: visibilityCond2,
          visible_if_not: '{}'
        }
    });
    expect(wrapper.find('textarea')).toHaveLength(0);
  });

  it('Does not render a parameter when visible_if_not conditions are met', () => {
    var wrapper = shallowParameter({
        visible: true,
        value: 'data.sfgov.org',
        parameter_spec: {
          type: 'string',
          visible_if: '{}',
          visible_if_not: visibilityCond1
        }
    });
    expect(wrapper.find('textarea')).toHaveLength(0);
  });

  it('Renders a parameter when visible_if_not conditions are not met', () => {
    var wrapper = shallowParameter({
        visible: true,
        value: 'data.sfgov.org',
        parameter_spec: {
          type: 'string',
          visible_if: '{}',
          visible_if_not: visibilityCond2
        }
    });
    expect(wrapper.find('textarea')).toHaveLength(1);
  });
});

