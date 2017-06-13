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

// reducer
const features = (state = [], action) => {
  switch (action.type) {
    case 'TOGGLE_SELECT_FEATURE':
      return state.map(featureObj => {
        if (featureObj.feature !== action.feature.feature) {
          return featureObj;
        }
        return {
           ...featureObj,
           meta: {...featureObj.meta, selected: !featureObj.meta.selected}
        };
      });
    case 'ADD_FEATURES':
      return state.concat(action.features);
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
    var features = [];
    for (var i = 0, ii = json.features.length; i < ii; ++i) {
      features.push({
        feature: json.features[i],
        meta: {}
      });
    }
    store.dispatch({
      type: 'ADD_FEATURES',
      features: features
    });
  }).catch(function(ex) {
    console.log('parsing failed', ex)
  });
};

const geojsonApp = combineReducers({
  features,
  filter
});

let FeatureTable = ( {features, filter, onSelect, onFilter} ) => {
  var rows = [];
  var header = [(<th key='0'>Selected</th>)];
  for (var i = 0, ii = features.length; i < ii; ++i) {
    var featureObj = features[i];
    var idx = i;
    var feature = featureObj.feature;
    var cells = [(<td key={idx}><input onChange={onSelect.bind(this, featureObj)} type='checkbox'/></td>)];
    for (var key in feature.properties) {
      if (i === 0) {
        header.push(<th key={key}>{key}</th>);
      }
      cells.push(<td key={key}>{feature.properties[key]}</td>);
    }
    var row = (<tr style={{backgroundColor: featureObj.meta.selected ? 'yellow' : undefined}} key={idx}>{cells}</tr>);
    if (filter) {
      if (featureObj.meta.selected) {
        rows.push(row);
      }
    } else {
      rows.push(row);
    }
  }
  var input = (<span><input type='checkbox' onChange={onFilter}/>Show selected only</span>);
  return (<div style={{position: 'absolute', left: 0, top: 0, width: '50%', height: '50%'}}>{input}<table><thead><tr>{header}</tr></thead><tbody>{rows}</tbody></table></div>);
}

const mapStateToProps = (state) => {
  return {features: state.features, filter: state.filter};
}

// action creator
function toggleSelect(feature) {
  return {
    type: 'TOGGLE_SELECT_FEATURE',
    feature: feature
  };
}

function filterSelected() {
  return {
    type: 'TOGGLE_FILTER_SELECTED'
  };
}

const mapDispatchToProps = (dispatch) => ({
  onSelect(feature) {
    dispatch(toggleSelect(feature));
  },
  onFilter() {
    dispatch(filterSelected());
  }
});

FeatureTable = connect(mapStateToProps, mapDispatchToProps)(FeatureTable);

class VectorContainer extends React.Component {
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
  }
  componentWillReceiveProps(nextProps) {
    let features = [];
    const format = new GeoJSONFormat();
    for (var i = 0, ii = nextProps.features.length; i < ii; ++i) {
      var add = true;
      for (var j = 0, jj = this.props.features.length; j < jj; ++j) {
        // feature already loaded?
        if (nextProps.features[i].feature === this.props.features[j].feature) {
          add = false;
          break;
        }
      }
      var feature;
      if (add) {
        feature = format.readFeature(nextProps.features[i].feature);
        features.push(feature);
      } else {
        if (nextProps.features[i].meta.selected) {
          // TODO ideally we would not have to recreate the feature here
          this._select.getFeatures().push(format.readFeature(nextProps.features[i].feature));
        } else {
          // TODO how can we match the ol.Feature instace?
          this._select.getFeatures().remove(nextProps.features[i].feature);
        }
      }
    }
    this._layer.getSource().addFeatures(features);
  }
  render() {
    return (<div style={{position: 'absolute', right: 0, top: 0, width: '50%', height: '100%'}} ref='map'></div>);
  }
}

VectorContainer = connect(mapStateToProps)(VectorContainer);

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
