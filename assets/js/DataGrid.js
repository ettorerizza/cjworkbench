// ---- DataGrid  ----
// Core table display component.
// Contains all logic that interfaces with react-data-grid
// Paged loading and other logic is in TableView, which is typically our parent

import React from 'react'
import ReactDOM from 'react-dom'
import ReactDataGrid, { HeaderCell } from 'react-data-grid'
import {idxToLetter} from "./utils";
import PropTypes from 'prop-types'
import debounce from 'debounce'
import ColumnContextMenu from './ColumnContextMenu'
import { sortDirectionNone } from './UpdateTableAction'

// --- Row and column formatting ---
const columnTypeDisplay = {
  'text': 'text',
  'number': 'number',
  'datetime': 'date & time'
}

// Custom Formatter component, to render row number in a different style
export class RowIndexFormatter extends React.PureComponent {
  static propTypes = {
    value: PropTypes.number.isRequired
  }

  render () {
    const text = String(this.props.value) // no commas -- horizontal space is at a premium

    return <div className={`row-number row-number-${text.length}`}>{text}</div>
  }
}

// Unfortunately, ReactDataGrid will send "new" values to "old" columns when
// switching to another version of a table that has the same column with a
// different type. So all formatters need to support all types. (We don't care
// about their output. though.)
const ReactDataGridValuePropType = PropTypes.oneOfType([
  PropTypes.string.isRequired,
  PropTypes.number.isRequired
])

class AbstractCellFormatter extends React.PureComponent {
  render () {
    const value = this.props.value
    if (value === null) {
      return <div className='cell-null'>{'null'}</div>
    }

    return this.renderNonNull()
  }
}

export class TextCellFormatter extends AbstractCellFormatter {
  static propTypes = {
    value: ReactDataGridValuePropType // string
  }

  renderNonNull () {
    return <div className='cell-text'>{this.props.value}</div>
  }
}

const numberFormat = new Intl.NumberFormat()
export class NumberCellFormatter extends AbstractCellFormatter {
  static propTypes = {
    value: ReactDataGridValuePropType // number
  }

  renderNonNull () {
    return <div className='cell-number'>{numberFormat.format(this.props.value)}</div>
  }
}

const ZeroEndOfDate = /(?:(?:T00:00)?:00)?\.000Z$/
export class DatetimeCellFormatter extends AbstractCellFormatter {
  static propTypes = {
    value: ReactDataGridValuePropType // string: -- ISO8601-formatted date
  }

  renderNonNull () {
    const value = this.props.value
    const date = new Date(value)

    if (isNaN(date)) {
      // A race! The input isn't a date because ReactDataGrid fed us "new"
      // data and we're the "old" formatter.
      return null // nobody will see it anyway
    }

    // Strip the end of the ISO string if it's all-zero. Restore the 'Z' at
    // the very end iff there's no time component. (The time component starts
    // with 'T'.)
    const text = date.toISOString()
      .replace(ZeroEndOfDate, (m) => m[0][0] === 'T' ? '' : 'Z')

    return <div className='cell-datetime'>{text}</div>
  }
}

const TypeToCellFormatter = {
  'text': TextCellFormatter,
  'datetime': DatetimeCellFormatter,
  'number': NumberCellFormatter
}

class ReorderColumnDropZone extends React.PureComponent {
  static propTypes = {
    leftOrRight: PropTypes.oneOf([ 'left', 'right' ]).isRequired,
    fromIndex: PropTypes.number.isRequired,
    toIndex: PropTypes.number.isRequired,
    onDropColumnIndexAtIndex: PropTypes.func.isRequired, // func(fromIndex, toIndex) => undefined
  }

  constructor(props) {
    super(props)

    this.state = {
      isDragHover: false,
    }
  }

  onDragEnter = (ev) => {
    this.setState({
      isDragHover: true,
    })
  }

  onDragLeave = (ev) => {
    this.setState({
      isDragHover: false,
    })
  }

  onDragOver = (ev) => {
    ev.preventDefault() // allow drop by preventing the default, which is "no drop"
  }

  onDrop = (ev) => {
    const { fromIndex, toIndex, onDropColumnIndexAtIndex } = this.props
    onDropColumnIndexAtIndex(fromIndex, toIndex)
  }

  render() {
    let className = 'column-reorder-drop-zone'
    className += ' align-' + this.props.leftOrRight
    if (this.state.isDragHover) className += ' drag-hover'

    return (
      <div
        className={className}
        onDragEnter={this.onDragEnter}
        onDragLeave={this.onDragLeave}
        onDragOver={this.onDragOver}
        onDrop={this.onDrop}
        >
      </div>
    )
  }
}

export class EditableColumnName extends React.Component {
  static propTypes = {
    columnKey: PropTypes.string.isRequired,
    columnType: PropTypes.string.isRequired,
    onRename: PropTypes.func.isRequired,
    isReadOnly: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      newName: props.columnKey,
      editMode: false,
    };

    this.inputRef = React.createRef();

    this.enterEditMode = this.enterEditMode.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleInputBlur = this.handleInputBlur.bind(this);
    this.handleInputKeyDown = this.handleInputKeyDown.bind(this);
  }

  componentDidUpdate(_, prevState) {
    if (!prevState.editMode && this.state.editMode) {
      const input = this.inputRef.current;
      if (input) {
        input.focus();
        input.select();
      }
    }
  }

  enterEditMode() {
    if(!this.props.isReadOnly) {
      this.setState({editMode: true});
    }
  }

  exitEditMode() {
    this.setState({editMode: false});
  }

  handleInputChange(event) {
    this.setState({newName: event.target.value});
  }

  handleInputCommit() {
    this.setState({
        editMode: false
    });
    if(this.state.newName != this.props.columnKey) {
      this.props.onRename({
        prevName: this.props.columnKey,
        newName: this.state.newName
      });
    }
  }

  handleInputBlur() {
    this.handleInputCommit();
  }

  handleInputKeyDown(event) {
    // Changed to keyDown as esc does not fire keyPress
    if(event.key == 'Enter') {
      this.handleInputCommit();
    } else if (event.key == 'Escape') {
      this.setState({newName: this.props.columnKey});
      this.exitEditMode();
    }
  }

  render() {
    if(this.state.editMode) {
      // The class name 'column-key-input' is used in
      // the code to prevent dragging while editing,
      // please keep it as-is.
      return (
        <input
          name='new-column-key'
          type='text'
          ref={this.inputRef}
          value={this.state.newName}
          onChange={this.handleInputChange}
          onBlur={this.handleInputBlur}
          onKeyDown={this.handleInputKeyDown}
        />
      );
    } else {
      return (
        <span
          className={'column-key'}
          onClick={this.enterEditMode}
        >
          <div>
            {this.state.newName}
          </div>
          <div className={'column-type'}>
            {columnTypeDisplay[this.props.columnType]}
          </div>
        </span>
      );
    }
  }
}

// Sort arrows, A-Z letter identifiers
export class ColumnHeader extends React.PureComponent {
  static propTypes = {
    columnKey: PropTypes.string.isRequired,
    columnType: PropTypes.string.isRequired,
    isReadOnly: PropTypes.bool.isRequired,
    index: PropTypes.number.isRequired,
    isSorted: PropTypes.bool.isRequired,
    sortDirection: PropTypes.number, // not required, which is weird
    showLetter: PropTypes.bool.isRequired,
    onDragStartColumnIndex: PropTypes.func.isRequired, // func(index) => undefined
    onDragEnd: PropTypes.func.isRequired, // func() => undefined
    onDropColumnIndexAtIndex: PropTypes.func.isRequired, // func(from, to) => undefined
    draggingColumnIndex: PropTypes.number, // if set, we are dragging
    onRenameColumn: PropTypes.func,
    setDropdownAction: PropTypes.func.isRequired
  }

  constructor(props) {
    super(props);

    this.inputRef = React.createRef();

    this.state = {
      isHovered: false,
      newName: props.columnKey
    };
  }

  setDropdownAction = (idName, forceNewModule, params) => {
    params = {
      ...params,
      columnKey: this.props.columnKey
    }
    this.props.setDropdownAction(idName, forceNewModule, params)
  }

  onRenameColumn = () => {
    this.inputRef.current.enterEditMode()
  }

  onMouseEnter = () => {
    this.setState({isHovered: true});
  }

  onMouseLeave = () => {
    this.setState({isHovered: false});
  }

  onDragStart = (ev) => {
    if(this.props.isReadOnly) {
      ev.preventDefault();
      return;
    }

    if(ev.target.classList.contains('column-key-input')) {
      ev.preventDefault();
      return;
    }

    this.props.onDragStartColumnIndex(this.props.index)

    ev.dataTransfer.effectAllowed = [ 'move' ]
    ev.dataTransfer.dropEffect = 'move'
    ev.dataTransfer.setData('text/plain', this.props.columnKey)
  }

  onDragEnd = () => {
    this.props.onDragEnd()
  }

  renderColumnMenu() {
    if(this.props.isReadOnly) {
      return null;
    }

    return (
      <ColumnContextMenu
        columnKey={this.props.columnKey}
        columnType={this.props.columnType}
        renameColumn={this.onRenameColumn}
        sortDirection={this.props.isSorted == true ? this.props.sortDirection : sortDirectionNone}
        setDropdownAction={this.setDropdownAction}
      />
    )
  }

  renderLetter() {
    if (this.props.showLetter) {
      return (
          // The 'column-letter' class name is used in the test so please be careful with it
          <div className='column-letter'>
            {idxToLetter(this.props.index)}
          </div>
      );
    } else {
      return null
    }
  }

  render() {
    const {
      columnKey,
      columnType,
      index,
      onDropColumnIndexAtIndex,
      draggingColumnIndex,
    } = this.props

    const columnMenuSection = this.renderColumnMenu();
    const letterSection = this.renderLetter();

    function maybeDropZone(leftOrRight, toIndex) {
      if (draggingColumnIndex === null) return null
      if (draggingColumnIndex === toIndex) return null

      // Also, dragging to fromIndex+1 is a no-op
      if (draggingColumnIndex === toIndex - 1) return null

      return (
        <ReorderColumnDropZone
          leftOrRight={leftOrRight}
          fromIndex={draggingColumnIndex}
          toIndex={toIndex}
          onDropColumnIndexAtIndex={onDropColumnIndexAtIndex}
          />
      )
    }

    const draggingClass = (draggingColumnIndex === index) ? 'dragging' : ''


    //<span className="column-key">{columnKey}</span>
    return (
      <React.Fragment>
        {letterSection}
        <div
          className={`data-grid-column-header ${draggingClass}`}
          onMouseEnter={this.onMouseEnter}
          onMouseLeave={this.onMouseLeave}
          draggable={true}
          onDragStart={this.onDragStart}
          onDragEnd={this.onDragEnd}
          >
          {maybeDropZone('left', index)}

            <EditableColumnName
              columnKey={columnKey}
              columnType={columnType}
              onRename={this.props.onRenameColumn}
              isReadOnly={this.props.isReadOnly}
              ref={this.inputRef}
            />
            {columnMenuSection}
          </div>
          {maybeDropZone('right', index + 1)}

      </React.Fragment>
    );
  }
}


// Add row number col and make all cols resizeable
function makeFormattedCols(props) {
  const editable = (props.onEditCell !== undefined) && props.wfModuleId !== undefined; // no wfModuleId means blank table

  const rowNumberColumn = {
    key: props.rowNumKey,
    name: '',
    formatter: RowIndexFormatter,
    width: 40,
    locked: true,
  }

  // We can have an empty table, but we need to give these props to ColumnHeader anyway
  const safeColumns = props.columns || [];
  const columnTypes = props.columnTypes || safeColumns.map(_ => '');
  const showLetter = props.showLetter || false;

  const columns = safeColumns.map((columnKey, index) => ({
    key: columnKey,
    name: columnKey,
    resizable: true,
    editable: editable,
    formatter: TypeToCellFormatter[columnTypes[index]] || TextCellFormatter,
    width: 160,
    // react-data-grid normally won't re-render if we change headerRenderer.
    // So we need to change _other_ props, forcing it to re-render.
    maybeTriggerRenderIfChangeDraggingColumnIndex: props.draggingColumnIndex,
    maybeTriggerRenderIfChangeIsSorted: (props.sortColumn === columnKey),
    maybeTriggerRenderIfChangeSortDirection: props.sortDirection,
    maybeTriggerRenderIfChangeShowLetter: props.showLetter,
    headerRenderer: (
      <ColumnHeader
        columnKey={columnKey}
        columnType={columnTypes[index]}
        index={index}
        isSorted={props.sortColumn === columnKey}
        sortDirection={props.sortDirection}
        showLetter={showLetter}
        onDragStartColumnIndex={props.onDragStartColumnIndex}
        onDragEnd={props.onDragEnd}
        draggingColumnIndex={props.draggingColumnIndex}
        onDropColumnIndexAtIndex={props.onDropColumnIndexAtIndex}
        onRenameColumn={props.onRenameColumn}
        isReadOnly={props.isReadOnly}
        setDropdownAction={props.setDropdownAction}
      />
    ),
  }))

  return [ rowNumberColumn ].concat(columns)
}


// --- Main component  ---

export default class DataGrid extends React.Component {
  static propTypes = {
    totalRows: PropTypes.number.isRequired,
    getRow: PropTypes.func.isRequired,
    columns: PropTypes.array.isRequired,
    isReadOnly: PropTypes.bool.isRequired,
    columnTypes: PropTypes.array,     // not required if blank table
    wfModuleId: PropTypes.number,    // not required if blank table
    lastRelevantDeltaId: PropTypes.number, // triggers a render on change
    onEditCell: PropTypes.func,
    sortColumn: PropTypes.string,
    sortDirection: PropTypes.number,
    showLetter: PropTypes.bool,
    onReorderColumns: PropTypes.func.isRequired,
    onRenameColumn: PropTypes.func.isRequired,
    setDropdownAction: PropTypes.func.isRequired
  }

  constructor(props) {
    super(props);

    this.state = {
      // gridWith and gridHeight start non-0, so rows get rendered in tests
      gridWidth: 100,
      gridHeight : 100,
      componentKey: 0,  // a key for the component; updates if the column header needs
      draggingColumnIndex: null,
    }

    this.onGridRowsUpdated = this.onGridRowsUpdated.bind(this);
  }

  // After the component mounts, and on any change, set the height to parent div height
  updateSize = () => {
    const domNode = ReactDOM.findDOMNode(this)
    if (domNode && domNode.parentElement) {
      const container = domNode.parentElement
      const gridHeight = Math.max(100, container.offsetHeight)
      const gridWidth = Math.max(100, container.offsetWidth)
      this.setState({ gridWidth, gridHeight })
    }
  }

  // Each ReactDataGrid col needs a unique key. Make one for our row number column
  get rowNumKey() {
    const columnKeys = this.props.columns
    let ret = 'rn_';
    while (columnKeys.includes(ret)) {
      ret += '_';
    }
    return ret;
  }

  componentDidMount() {
    this._resizeListener = debounce(this.updateSize, 50)
    window.addEventListener("resize", this._resizeListener)
    this.updateSize()
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this._resizeListener);
  }

  // Check if column names are changed between props, used for shouldKeyUpdate
  columnsChanged (prevProps, nextProps) {
    const prevColumns = prevProps.columns || null
    const nextColumns = nextProps.columns || null
    const prevTypes = prevProps.columnTypes || null
    const nextTypes = nextProps.columnTypes || null

    if (prevColumns === nextColumns && prevTypes === nextTypes) {
      return false
    }

    if (prevColumns === null || nextColumns === null || prevTypes === null || nextTypes === null) {
      return true
    }

    if (prevColumns.length !== nextColumns.length) {
      return true
    }

    for (let i = 0; i < prevColumns.length; i++) {
      if (prevColumns[i] !== nextColumns[i] || prevTypes[i] !== nextTypes[i]) {
        return true
      }
    }

    return false
  }

  shouldKeyUpdate (prevProps) {
    if (this.props.sortColumn !== prevProps.sortColumn) {
      return true
    }
    if (this.props.sortDirection !== prevProps.sortDirection) {
      return true
    }
    if (this.props.showLetter !== prevProps.showLetter) {
      return true
    }
    // For some reason, react-data-grid does not change column order
    // in its output when the column order changes when custom header renderer
    // is involved, so we bump the key if columns are changed
    if (this.columnsChanged(prevProps, this.props)) {
      return true
    }
    return false
  }

  componentDidUpdate (prevProps) {
    if (this.shouldKeyUpdate(prevProps)) {
      this.setState({ componentKey: this.state.componentKey + 1 })
    }
  }

  // Add row number as first column, when we look up data
  getRow = (i) => {
    const row = this.props.getRow(i);
    if (row === null) return null;
    // 1 based row numbers
    return { [this.rowNumKey]: i + 1, ...row }
  }

  onGridRowsUpdated({ fromRow, toRow, updated }) {
    if (fromRow !== toRow) {
      // possible if drag handle not hidden, see https://github.com/adazzle/react-data-grid/issues/822
      console.log('More than one row changed at a time in DataGrid, how?')
    }

    if(this.props.isReadOnly) {
      throw new Error("Attempting to edit cells in a read-only workflow.");
    }

    if (this.props.onEditCell)
      var colKey = Object.keys(updated)[0];
      var newVal = updated[colKey];
      this.props.onEditCell(fromRow, colKey, newVal)  // column key is also column name
  }

  onDropColumnIndexAtIndex = (fromIndex, toIndex) => {
    const sourceKey = this.props.columns[fromIndex];
    let reorderInfo = {
        column: sourceKey,
        from: fromIndex,
        to: toIndex,
      }

    this.props.onReorderColumns(this.props.wfModuleId, 'reorder-columns', false, reorderInfo);
  };

  onDragStartColumnIndex = (index) => {
    this.setState({
      draggingColumnIndex: index,
    })
  };

  onDragEnd = () => {
    this.setState({
      draggingColumnIndex: null,
    })
  };

  onRename = (renameInfo) => {
    this.props.onRenameColumn(this.props.wfModuleId, 'rename-columns', false, renameInfo);
  };

  render() {
    if (this.props.totalRows > 0) {
      const draggingProps = {
        ...this.props,
        rowNumKey: this.rowNumKey,
        onDragStartColumnIndex: this.onDragStartColumnIndex,
        onDragEnd: this.onDragEnd,
        draggingColumnIndex: this.state.draggingColumnIndex,
        onDropColumnIndexAtIndex: this.onDropColumnIndexAtIndex,
        onRenameColumn: this.onRename,
      }
      const columns = makeFormattedCols(draggingProps)

      return(
        <ReactDataGrid
          columns={columns}
          rowGetter={this.getRow}
          rowsCount={this.props.totalRows}
          minWidth={this.state.gridWidth -2}
          minHeight={this.state.gridHeight-2}   // -2 because grid has borders, don't want to expand our parent DOM node
          headerRowHeight={this.props.showLetter ? 68 : 50}
          enableCellSelect={true}
          onGridRowsUpdated={this.onGridRowsUpdated}
          key={this.state.componentKey}
        />
      )
    } else {
      return null;
    }
  }
}
