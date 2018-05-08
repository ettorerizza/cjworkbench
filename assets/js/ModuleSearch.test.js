/**
 * Testing Stories:
 * -Renders a search bar
 * -Search bar will render suggestions of modules matching input
 * 
 */

import React from 'react'
import { ModuleSearch } from './ModuleSearch' // not redux-connected
import { mount, shallow } from 'enzyme'

describe('ModuleSearch', () => {
  const items = [
    {
      "id":4,
      "name":"Load from Enigma",
      "category":"Add data",
      "description":"Connect a dataset from Enigma's collection via URL.",
      "link":"",
      "author":"Workbench",
      "icon":"url"
    },
    {
      "id":10,
      "name":"Filter by Text",
      "category":"Filter",
      "description":"Filter rows by matching text in specific columns.",
      "link":"",
      "author":"Workbench",
      "icon":"filter"
    }
  ];
  const workflow = {
    "id":15,
    "name":"What a workflow!"
  };
  const defaultProps = {
    addModule: () => {},
    items,
    workflow,
    isLessonHighlight: false,
  }

  describe('most tests', () => {
    let wrapper;
    beforeEach(() => wrapper = mount(<ModuleSearch {...defaultProps}/>));

    let searchField;
    beforeEach(() => searchField = wrapper.find('.react-autosuggest__input'));    

    it('Renders search bar', () => { 
      expect(wrapper).toMatchSnapshot(); // 1    
    });

    it('Loads modules from props ', (done) => { 
      // wait modules to load from props
      setImmediate( () => {
        expect(wrapper).toMatchSnapshot(); 
        expect(wrapper.state().modules.length).toBe(2);      
        expect(wrapper.state().modules[0].title).toEqual("Add data");
        expect(wrapper.state().modules[1].title).toEqual("Filter");
        done();
      });
    });

    it('Finds a suggestion matching search input', (done) => { 
      // wait modules to load 
      setImmediate( () => {
        // Search field is focused by default, enter value to text field
        searchField.simulate('change', {target: {value: 'a'}});
        expect(wrapper).toMatchSnapshot();      
        // check for presence of suggestion matching input
        expect(wrapper.state().suggestions.length).toEqual(1);              
        expect(wrapper.state().suggestions[0].modules[0].name).toEqual("Load from Enigma");      
        done();
      });
    });

    it('Close icon will clear text from search field', () => { 
      // search field should be empty at start
      expect(wrapper.state().value).toEqual(''); 
      // close icon whould not be rendered
      let closeIcon = wrapper.find('.icon-close-white');
      expect(closeIcon).toHaveLength(0);             
      // enter value to text field
      searchField.simulate('change', {target: {value: 'wow'}});
      expect(wrapper).toMatchSnapshot();          
      expect(wrapper.state().value).toEqual('wow'); 
      // find Close icon again, click to clear search field
      closeIcon = wrapper.find('.icon-close-white');
      expect(closeIcon).toHaveLength(1);
      closeIcon.simulate('click');
      expect(wrapper.state().value).toEqual('');              
    });
  })
    
  it('should highlight based on isLessonHighlight', () => {
    const noHighlight = shallow(<ModuleSearch {...defaultProps} isLessonHighlight={false} />)
    expect(noHighlight.hasClass('lesson-highlight')).toBe(false)

    const yesHighlight = shallow(<ModuleSearch {...defaultProps} isLessonHighlight={true} />)
    expect(yesHighlight.hasClass('lesson-highlight')).toBe(true)
  })
});

