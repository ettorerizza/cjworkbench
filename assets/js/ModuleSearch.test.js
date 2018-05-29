/**
 * Testing Stories:
 * -Renders a search bar
 * -Search bar will render suggestions of modules matching input
 * 
 */
jest.mock('./lessons/lessonSelector', () => jest.fn()) // same mock in every test :( ... we'll live

import React from 'react'
import ConnectedModuleSearch, { ModuleSearch } from './ModuleSearch'
import { mount, shallow } from 'enzyme'
import { createStore } from 'redux'
import { Provider } from 'react-redux'
import lessonSelector from './lessons/lessonSelector'

describe('ModuleSearch', () => {
  const modules = [
    {
      id: 4,
      name: "Load from Enigma",
      category: "Add data",
      icon: "url",
      isLessonHighlight: true,
    },
    {
      id: 10,
      name: "Filter by Text",
      category: "Filter",
      icon: "filter",
      isLessonHighlight: false,
    }
  ];
  let defaultProps
  beforeEach(() => defaultProps = {
    onClickModuleId: jest.fn(),
    onCancel: jest.fn(),
    modules,
    isLessonHighlight: false,
  })

  describe('most tests', () => {
    let wrapper
    beforeEach(() => wrapper = mount(<ModuleSearch {...defaultProps}/>))
    afterEach(() => wrapper.unmount())

    let searchField
    beforeEach(() => searchField = wrapper.find('input[name="moduleQ"]'))

    it('matches snapshot', () => { 
      expect(wrapper).toMatchSnapshot()
    })

    it('finds all suggestions by default', () => {
      expect(wrapper.text()).toMatch(/Load from Enigma/)
      expect(wrapper.text()).toMatch(/Filter by Text/)
    })

    it('finds a suggestion matching search input', () => { 
      searchField.simulate('change', {target: {value: 'a'}})
      wrapper.update()
      expect(wrapper.text()).toMatch(/Load from Enigma/)
      expect(wrapper.text()).not.toMatch(/Filter by Text/)
    })

    it('calls onCancel on form reset (e.g., clicking button.close)', () => { 
      // search field should be empty at start
      wrapper.find('form').simulate('reset')
      expect(wrapper.prop('onCancel')).toHaveBeenCalled()
    });

    it('calls onCancel on pressing Escape', () => {
      searchField.simulate('keyDown', { keyCode: 27 })
      expect(wrapper.prop('onCancel')).toHaveBeenCalled()
    })

    it('calls onClickModuleId on click', () => {
      wrapper.find('li[data-module-name="Load from Enigma"]').simulate('click')
      expect(wrapper.prop('onClickModuleId')).toHaveBeenCalledWith(4)
    })

    it('should lesson-highlight module', () => {
      expect(wrapper.find('li[data-module-name="Load from Enigma"]').hasClass('lesson-highlight')).toBe(true)
      expect(wrapper.find('li[data-module-name="Filter by Text"]').hasClass('lesson-highlight')).toBe(false)
    })
  })
    
  it('should highlight search box based on isLessonHighlight', () => {
    const noHighlight = shallow(<ModuleSearch {...defaultProps} isLessonHighlight={false} />)
    expect(noHighlight.hasClass('lesson-highlight')).toBe(false)

    const yesHighlight = shallow(<ModuleSearch {...defaultProps} isLessonHighlight={true} />)
    expect(yesHighlight.hasClass('lesson-highlight')).toBe(true)
  })

  describe('with store', () => {
    let store
    let wrapper
    let nonce = 0

    function highlight(yesOrNo, moduleName) {
      lessonSelector.mockReturnValue({
        testHighlight: test => {
          if (!yesOrNo) return false
          if (test.type === 'ModuleSearch') return true
          return test.type === 'MlModule' && test.name === moduleName
        }
      })

      // trigger a change
      store.dispatch({ type: 'whatever', payload: ++nonce })
    }

    beforeEach(() => {
      lessonSelector.mockReset()

      // Store just needs to change, to trigger mapStateToProps. We don't care
      // about its value
      store = createStore((_, action) => ({ modules, ...action.payload }), { modules })

      highlight(false)

      wrapper = mount(
        <Provider store={store}>
          <ConnectedModuleSearch {...defaultProps} alwaysRenderSuggestions={true} />
        </Provider>
      )
    })
    afterEach(() => {
      wrapper.unmount()
    })

    it('loads modules', () => {
      expect(wrapper.text()).toMatch(/Load from Enigma/)
    })

    it('highlights the search box', () => {
      highlight(true, null)
      wrapper.update()
      expect(wrapper.find('.module-search').prop('className')).toMatch(/\blesson-highlight\b/)
    })
  })
});

