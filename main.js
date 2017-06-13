import {createStore, combineReducers} from 'redux';
import {Provider, connect} from 'react-redux';
import React from 'react';
import ReactDOM from 'react-dom';
import Map from 'ol/map';
import View from 'ol/view';
import TileLayer from 'ol/layer/tile';
import XYZ from 'ol/source/xyz';
import VectorLayer from 'ol/layer/vector';
import VectorSource from 'ol/source/vector';
import GeoJSONFormat from 'ol/format/geojson';
import Style from 'ol/style/style';
import CircleStyle from 'ol/style/circle';
import FillStyle from 'ol/style/fill';
import SelectInteraction from 'ol/interaction/select';
import proj from 'ol/proj';

import uuid from 'uuid';

// reducer
const features = (state = [], action) => {
  let features = [];
  switch (action.type) {
    case 'CLEAR_SELECTION':
      return state.map(feature => {
        return Object.assign(feature, {
          properties: Object.assign(feature.properties, {
            __selected: false
          })
        });
      });
    case 'TOGGLE_SELECT_FEATURE':
      return state.map(featureObj => {
        if (action.id === featureObj.properties['__id']) {
          return Object.assign(featureObj, {
            properties: Object.assign(featureObj.properties, {
              __selected: !featureObj.properties.__selected,
            })
          });
        } else {
          return featureObj;
        }
      });
    case 'ADD_FEATURES':
      features = [].concat(state);
      for(const feature of action.features) {
        const properties = Object.assign(feature.properties, {
          __selected: false,
          __id: uuid(),
        });
        features.push(Object.assign(feature, {
          properties: Object.assign(feature.properties, properties)
        }));
      }
      return features;
    case 'REMOVE_FEATURE':
      features = [];
      for(const feature of state) {
        console.log(action.id, feature.properties['__id']);
        if(action.id !== feature.properties['__id']) {
          features.push(feature);
        }
      }
      return features;
    default:
      return state;
  } 
};

const filter = (state = false, action) => {
  switch(action.type) {
    case 'TOGGLE_FILTER_SELECTED':
      return !state;
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
  features,
  filter
});

let FeatureTable = ( {features, onSelect, removeFeature} ) => {
  var rows = [];
  features.map((feature, idx) => {
    var cells = [(<td key={idx}><input onChange={onSelect.bind(this, feature)} checked={feature.properties.__selected} type='checkbox'/></td>)];
    cells.push((
      <td key={'delete'+idx}><button onClick={removeFeature.bind(this, feature)} >-</button></td>
    ));
    for (var key in feature.properties) {
      if(key.substring(0,2) != '__') {
        cells.push(<td key={key}>{feature.properties[key]}</td>);
      }
    }
    rows.push(<tr style={{backgroundColor: feature.properties.__selected ? 'yellow' : undefined}} key={idx}>{cells}</tr>);
  });
  return (<div style={{position: 'absolute', left: 0, top: 0, width: '50%', height: '50%'}}><table><tbody>{rows}</tbody></table></div>);
}

const mapStateToProps = (state) => {
  return {features: state.features, filter: state.filter};
}

// action creator
function toggleSelect(id) {
  return {
    type: 'TOGGLE_SELECT_FEATURE',
    id
  };
}

function removeFeature(id) {
  return {
    type: 'REMOVE_FEATURE',
    id
  };
}

function filterSelected() {
  return {
    type: 'TOGGLE_FILTER_SELECTED'
  };
}

const mapDispatchToProps = (dispatch) => ({
  onSelect(feature) {
    const feature_id = feature.properties['__id'];
    dispatch(toggleSelect(feature_id));
  },
  removeFeature(feature) {
    const feature_id = feature.properties['__id'];
    dispatch(removeFeature(feature_id));
  }
});

FeatureTable = connect(mapStateToProps, mapDispatchToProps)(FeatureTable);

class VectorContainer extends React.Component {
  constructor(props) {
    super(props);

    this.knownFeatures = {};
  }
      
  componentDidMount() {
    this._layer = new VectorLayer({
      source: new VectorSource()
    });
    this._select = new SelectInteraction();
    const map = new Map({
      target: ReactDOM.findDOMNode(this.refs.map),
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          })
        }),
        this._layer
      ],
      view: new View({
        center: proj.fromLonLat([-150, 60]),
        zoom: 3
      })
    });
    map.addInteraction(this._select);

    this._select.on('select', (evt) => {
      this.props.clearSelection();
      const feature_ids = [];
      for(const feature of evt.selected) {
        //feature_ids.push(feature.getProperties()['__id']);
        this.props.selectFeature(feature);
      }
    });
  }
  componentWillReceiveProps(nextProps) {
    // bucket for features to be added to the layer
    let new_features = [];
    const format = new GeoJSONFormat();
    // get a unique state identifier
    const state_counter = uuid();

    const selected_features = {};

    for (var i = 0, ii = nextProps.features.length; i < ii; ++i) {
      const feature = nextProps.features[i];
      const feature_id = feature.properties.__id;

      // this feature doesn't exist on the map, create it.
      if(!this.knownFeatures[feature_id]) {
        new_features.push(format.readFeature(feature));
      }

      if(feature.properties.__selected) {
        selected_features[feature_id] = true;
      }

      // know that this feature is on the current state.
      this.knownFeatures[feature_id] = state_counter;
    }

    // remove features no longer on state.
    const src = this._layer.getSource();

    // clear the selected layers.
    this._select.getFeatures().clear();

    for(const feature of src.getFeatures()) {
      const feature_id = feature.getProperties()['__id']
      // if the feature is not on the current "state" then
      //  remove the feature.
      if(this.knownFeatures[feature_id] !== state_counter) {
        src.removeFeature(feature);
        delete this.knownFeatures[feature_id];
      // if the feature is "selected" in the dom then render 
      //  it as such in the select tool.
      } else if(selected_features[feature_id] === true) {
        this._select.getFeatures().push(feature);
      }
    }

    // add the new features
    if(new_features.length > 0) {
      this._layer.getSource().addFeatures(new_features);
    }
  }
  render() {
    return (<div style={{position: 'absolute', right: 0, top: 0, width: '50%', height: '100%'}} ref='map'></div>);
  }
}

const mapDispatchToVectorProps = (dispatch) => ({
  selectFeature(feature) {
      dispatch({
        type: 'TOGGLE_SELECT_FEATURE',
        id: feature.getProperties()['__id']
      });
  },
  clearSelection() {
      dispatch({type: 'CLEAR_SELECTION'});
  }
});
VectorContainer = connect(mapStateToProps, mapDispatchToVectorProps)(VectorContainer);

const store = createStore(geojsonApp);
featureLoader('./airports.json', store);

ReactDOM.render(
  <Provider store={store}>
    <div>
      <FeatureTable/>
      <VectorContainer/>
    </div>
  </Provider>
, document.getElementById('map'));
