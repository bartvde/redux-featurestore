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

const features = (state = [], action) => {
  switch (action.type) {
    case 'TOGGLE_SELECT_FEATURE':
      return state.map(feature => {
        if (feature !== action.feature) {
          return feature;
        }
        return {
           ...feature,
           selected: !feature.selected
        };
      });
    case 'ADD_FEATURES':
      return state.concat(action.features);
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

let FeatureTable = ( {features, onSelect} ) => {
  var rows = [];
  features.map(function(feature, idx) {
    var cells = [(<td key={idx}><input onChange={onSelect.bind(this, feature)} type='checkbox'/></td>)];
    for (var key in feature.properties) {
      cells.push(<td key={key}>{feature.properties[key]}</td>);
    }
    rows.push(<tr style={{backgroundColor: feature.selected ? 'yellow' : undefined}} key={idx}>{cells}</tr>);
  });
  return (<div style={{position: 'absolute', left: 0, top: 0, width: '50%', height: '50%'}}><table><tbody>{rows}</tbody></table></div>);
}

const mapStateToProps = (state) => {
  return {features: state.features};
}

// action creator
function toggleSelect(feature) {
  return {
    type: 'TOGGLE_SELECT_FEATURE',
    feature: feature
  };
}

const mapDispatchToProps = (dispatch) => ({
  onSelect(feature) {
    dispatch(toggleSelect(feature));
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
        center: [0, 0],
        zoom: 2
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
        if (nextProps.features[i] === this.props.features[j]) {
          add = false;
          break;
        }
      }
      var feature;
      if (add) {
        feature = format.readFeature(nextProps.features[i]);
        if (nextProps.features[i].selected === undefined) {
          features.push(feature);
        } else if (nextProps.features[i].selected) {
          this._select.getFeatures().push(feature);
        } else {
          // this won't work since instances differ
          this._select.getFeatures().remove(feature);
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
