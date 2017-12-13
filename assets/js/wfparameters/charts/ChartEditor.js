import React from 'react'
import ColumnColorPicker from  './ColumnColorPicker'
import debounce from 'lodash/debounce'
import DateScaleSettings from './DateScaleSettings'
//var DateScaleSettings = require('chartbuilder/src/js/components/shared/DateScaleSettings.jsx');
var SessionStore = require('chartbuilder/src/js/stores/SessionStore');

export default class ChartEditor extends React.Component {
  constructor(props) {
    super(props);
    this.onChangeChartSettings = this.onChangeChartSettings.bind(this);
    this.onChangeTitle = this.onChangeTitle.bind(this);
    this.saveState = debounce(this.props.saveState, 500);
    this.onChangeDate = this.onChangeDate.bind(this);
    this.onChangePrefix = this.onChangePrefix.bind(this);
    this.onChangeSuffix = this.onChangeSuffix.bind(this);
  }

  componentWillMount() {
    if (this.props.chartState !== "") {
      this.setState(
        Object.assign( {},
          JSON.parse(this.props.chartState),
          {session: SessionStore.getAll()}
        )
      );
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.revision !== nextProps.revision) {
      this.setState(
        Object.assign( {},
          JSON.parse(nextProps.chartState),
          {session: SessionStore.getAll()}
        )
      );
    }
  }

  onChangeChartSettings(state) {
    let stateCopy = Object.assign({}, this.state);
    stateCopy.chartProps.chartSettings = state;
    this.saveState(JSON.stringify(stateCopy));
  }

  onChangeTitle(e) {
    let stateCopy = Object.assign({}, this.state);
    stateCopy.metadata.title = e.target.value;
    this.setState(stateCopy);
    this.saveState(JSON.stringify(stateCopy));
  }

  onChangePrefix(e) {
    let stateCopy = Object.assign({}, this.state);
    stateCopy.chartProps.scale.primaryScale.prefix = e.target.value;
    this.setState(stateCopy);
    this.saveState(JSON.stringify(stateCopy));
  }

  onChangeSuffix(e) {
    let stateCopy = Object.assign({}, this.state);
    stateCopy.chartProps.scale.primaryScale.suffix = e.target.value;
    this.setState(stateCopy);
    this.saveState(JSON.stringify(stateCopy));
  }

  onChangeDate(uh) {
    let stateCopy = Object.assign({}, this.state);
    stateCopy.chartProps.scale = uh;
    this.saveState(JSON.stringify(stateCopy));
  }

  render() {
    if (this.props.chartState !== "") {
      return (
        <div>
          <div className="param-line-margin">
            <ColumnColorPicker
              series={this.state.chartProps.chartSettings}
              saveState={this.onChangeChartSettings}/>
          </div>
          <div className="param-line-margin">
            <div className="label-margin t-d-gray content-3">
              Chart Title
            </div>
            <input
              type="text"
              className="wfmoduleStringInput parameter-base t-d-gray content-2 text-field"
              value={this.state.metadata.title}
              onChange={this.onChangeTitle} />
          </div>
          <div className="paramX-line-margin">

            <div className="param2-line-margin">
              <div className="label-margin t-d-gray content-3">
                Axis prefix
              </div>
              <input
                type="text"
                className="wfmoduleStringInput t-d-gray parameter-base content-2 text-field"
                value={this.state.chartProps.scale.primaryScale.prefix}
                onChange={this.onChangePrefix} />
            </div>

            <div className="param2-line-margin">
              <div className="label-margin t-d-gray content-3">
                Axis suffix
              </div>
              <input
                type="text"
                className="wfmoduleStringInput t-d-gray parameter-base content-2 text-field"
                value={this.state.chartProps.scale.primaryScale.suffix}
                onChange={this.onChangeSuffix} />
            </div>

          </div>

          {this.state.chartProps.scale.hasDate &&
          <DateScaleSettings
            scale={this.state.chartProps.scale}
            nowOffset={this.state.session.nowOffset}
            now={this.state.session.now}
            onUpdate={this.onChangeDate}/>
          }
        </div>
      )
    } else {
      return (
        <div></div>
      )
    }
  }
}
