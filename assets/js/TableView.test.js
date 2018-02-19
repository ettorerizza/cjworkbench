import React from 'react'
import { mount } from 'enzyme'
import { jsonResponseMock } from "./utils";
import TableView from "./TableView";
import { mockAddCellEdit } from "./TableView"

describe('TableView', () => {

  it('Fetches and renders', (done) => {

    var renderResponse = {
      total_rows: 2,
      start_row: 0,
      end_row: 2,
      columns: ["a", "b", "c"],
      rows: [
        {
          "a": "1",
          "b": "2",
          "c": "3"
        },
        {
          "a": "4",
          "b": "5",
          "c": "6"
        }
      ]
    };
    var api = {
      render: jsonResponseMock(renderResponse),
    };

    const tree = mount(<TableView id={100} revision={1} api={api}/>)

    // wait for promise to resolve, then see what we get
    setImmediate(() => {
      // should have called API for its data, and loaded it
      expect(api.render.mock.calls.length).toBe(1);
      expect(api.render.mock.calls[0][0]).toBe(100);
      expect(tree.state().tableData.rows).toHaveLength(2);

      // Header etc should be here
      expect(tree.find('.outputpane-header')).toHaveLength(1);
      expect(tree.find('.outputpane-data')).toHaveLength(1);

      expect(tree).toMatchSnapshot();

      // Call onEditCell and make sure the row state updates
      mockAddCellEdit(jest.fn());
      expect(tree.state().tableData.rows[1]['b']).toBe('5');
      tree.instance().onEditCell(1, 'b', '1000');
      expect(tree.state().tableData.rows[1]['b']).toBe('1000');

      done();
    });
  });


  it('Header only when no module id', () => {
    const tree = mount(<TableView id={undefined} revision={1} api={{}}/>)
    tree.update();

    expect(tree.find('.outputpane-header')).toHaveLength(1);
    expect(tree.find('.outputpane-data')).toHaveLength(0);
    expect(tree).toMatchSnapshot();
  });

});

// TODO: test scrolling / lazy load logic, probably by calling getRow manually
