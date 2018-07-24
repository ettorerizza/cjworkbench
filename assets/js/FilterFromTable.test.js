import { updateTableActionModule, selectColumnDrop, selectColumnKeep } from './UpdateTableAction'
import {tick} from './test-utils'
import { store, addModuleAction, setParamValueAction, setParamValueActionByIdName, setSelectedWfModuleAction } from './workflow-reducer'

jest.mock('./workflow-reducer');

describe("FilterFromTable actions", () => {
  // A few parameter id constants for better readability
  const idName = 'filter'
  const COLUMN_PAR_ID_1 = 35;
  const COLUMN_PAR_ID_2 = 70;
  const COLUMN_PAR_ID_3 = 140;

  var initialState = {
    updateTableModuleIds: { 'filter': 77 },
    workflow: {
      id: 127,
      wf_modules: [
        {
          id: 17,
          module_version: {
            module: {
              id_name: 'loadurl'
            }
          }
        },
        {
          id: 18,
          module_version: {
            module: {
              id_name: 'selectcolumns'
            }
          }
        },
        {
          // An existing select module with 2 columns kept
          id: 7,
          module_version: {
            module: {
              id_name: idName
            }
          },
          parameter_vals: [
            {
              id: COLUMN_PAR_ID_2,
              parameter_spec: {id_name: 'column'},
              value: 'col_1'
            }
          ]
        },
        {
          id: 19,
          module_version: {
            module: {
              id_name: 'colselect'
            }
          }
        },
        {
          id: 31,
          module_version: {
            module: {
              id_name: 'filter'
            }
          }
        }
      ]
    }
  };

  const addModuleResponse = {
    id: 23,
    module_version: {
      module: {
        id_name: idName
      }
    },
    parameter_vals: [
      {
        id: COLUMN_PAR_ID_1,
        parameter_spec: {id_name: 'column'},
        value: ''
      },
    ]
  };

  beforeEach(() => {
    store.getState.mockImplementation(() => initialState);
    // Our shim Redux API:
    // 1) actions are functions; dispatch returns their retvals in a Promise.
    //    This is useful when we care about retvals.
    // 2) actions are _not_ functions; dispatch does nothing. This is useful when
    //    we care about arguments.
    store.dispatch.mockImplementation(action => {
      if (typeof action === 'function') {
        return Promise.resolve({ value: action() })
      }
    });

    setParamValueAction.mockImplementation((...args) => [ 'setParamValueAction', ...args ])
    setParamValueActionByIdName.mockImplementation((...args) => [ 'setParamValueActionByIdName', ...args ])
    setSelectedWfModuleAction.mockImplementation((...args) => [ 'setSelectedWfModuleAction', ...args ])
  })

  it('adds new filter module after the given module and sets column parameter', async () => {
    addModuleAction.mockImplementation(() => () => addModuleResponse);
    updateTableActionModule(17, idName, true, 'col_1');

    await tick();
    expect(addModuleAction).toHaveBeenCalledWith(initialState.updateTableModuleIds[idName], 1);
    expect(store.dispatch).toHaveBeenCalledWith([ 'setParamValueActionByIdName', 23, 'column', 'col_1' ]);
  });

  it('selects the existing filter module but forces add new', async () => {
    addModuleAction.mockImplementation(() => () => addModuleResponse);
    updateTableActionModule(7, idName, true, 'col_2');

    await tick();
    expect(addModuleAction).toHaveBeenCalledWith(initialState.updateTableModuleIds[idName], 3);
    expect(store.dispatch).toHaveBeenCalledWith([ 'setParamValueActionByIdName', 23, 'column', 'col_2' ]);
  })
});
