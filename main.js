import {createStore, combineReducers} from 'redux';
import {Provider, connect} from 'react-redux';
import React from 'react';
import ReactDOM from 'react-dom';

var initialFeatures = {
  type : 'FeatureCollection',
  features : [
    { "type": "Feature",
      "geometry": {"type": "Point", "coordinates": [0, 1]},
      "properties": {"prop0": "value0"}
    }
  ]
};

const features = (state = initialFeatures, action) => {
  switch (action.type) {
    default:
      return state;
  } 
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
    const featureItems = features.features.map(function(feature, idx) {
      return (<li key={idx}>{feature.properties.prop0}</li>);
    });
    return (<ul>{featureItems}</ul>);
  }
}

const mapStateToProps = (state) => {
  return {features: state.features};
}

const FeaturesApp = connect(mapStateToProps)(FeatureTable);

ReactDOM.render(
  <Provider store={createStore(geojsonApp)}>
    <FeaturesApp/ >
  </Provider>
, document.getElementById('map'));
