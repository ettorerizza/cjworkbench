import React from 'react'
import PropTypes from 'prop-types'
import {idxToLetter} from "../utils";
import Table from 'reactstrap/lib/Table'

export default class ReorderHistory extends React.Component {
    render() {
        let historyStr = this.props.history.trim();
        let history = (historyStr.length > 0) ? JSON.parse(historyStr) : [];
        let historyRows = history.map((entry, idx) => {
            return (
                // Note: The class names are used in tests, please keep them intact
                // or update the tests if you change them.
                <tr key={idx}>
                    <td className={'reorder-idx'}>{idx + 1}</td>
                    <td className={'reorder-column'}>{entry.column}</td>
                    <td className={'reorder-from'}>{idxToLetter(entry.from)}</td>
                    <td className={'reorder-to'}>{idxToLetter(entry.to)}</td>
                </tr>
            );
        });

        return (
            <Table>
                <thead>
                    <tr>
                        <td className={'reorder-info'}>#</td>
                        <td className={'reorder-info'}>COLUMN</td>
                        <td className={'reorder-position'}>FROM</td>
                        <td className={'reorder-position'}>TO</td>
                    </tr>
                </thead>
                <tbody>
                    {historyRows}
                </tbody>
            </Table>
        );
    }
}

ReorderHistory.propTypes = {
    history: PropTypes.string.isRequired
}
