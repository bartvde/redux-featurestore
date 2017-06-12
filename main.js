import {createStore, combineReducers} from 'redux';
import {Provider, connect} from 'react-redux';
import React from 'react';
import ReactDOM from 'react-dom';

const features = (state = [], action) => {
  switch (action.type) {
    case 'ADD_FEATURES':
      return state.concat(action.features);
    break;
    default:
      return state;
  } 
};

const featureLoader = (url, store) => {
  fetch(url)
    .then(function(response) {
    return response.json()
  }).then(function(json) {
    store.dispatch({
      type: 'ADD_FEATURES',
      features: json.features
    });
  }).catch(function(ex) {
    console.log('parsing failed', ex)
  });
};

const geojsonApp = combineReducers({
  features
});

class FeatureTable extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    const {features} = this.props;
    var rows = [];
    features.map(function(feature, idx) {
      var cells = [];
      for (var key in feature.properties) {
        cells.push(<td key={key}>{feature.properties[key]}</td>);
      }
      rows.push(<tr key={idx}>{cells}</tr>);
    });
    return (<table><tbody>{rows}</tbody></table>);
  }
}

const mapStateToProps = (state) => {
  return {features: state.features};
}

const FeaturesApp = connect(mapStateToProps)(FeatureTable);

const store = createStore(geojsonApp);
featureLoader('./airports.json', store);

ReactDOM.render(
  <Provider store={store}>
    <FeaturesApp/ >
  </Provider>
, document.getElementById('map'));
