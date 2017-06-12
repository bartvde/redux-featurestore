import {createStore, combineReducers} from 'redux';
import {Provider, connect} from 'react-redux';
import React from 'react';
import ReactDOM from 'react-dom';

const features = (state = {type: "FeatureCollection", features: []}, action) => {
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
    console.log(props);
    super(props);
  }
  render() {
    return (<div/>);
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
