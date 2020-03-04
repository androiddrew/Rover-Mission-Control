import React, {Component} from 'react';
import { Col, Row } from 'react-bootstrap';
import RGL, { WidthProvider } from "react-grid-layout";
import {
  LineChart, Line, Label, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

import config from './config';
import Toolbar from './Toolbar';

const lineColors = ['#8884d8', '#82ca9d', '#CCCC00'];

const ReactGridLayout = WidthProvider(RGL);

export default class CoreView extends Component {
  constructor() {
    super();

    this.state = {
      wsOpen: false,
      wsClosing: false,
      wsConnecting: false,
      data: []
    };

    this.ip = config.defaultRoverIp;
    this.connect = this.connect.bind(this);
    this.connectDisconnectClicked = this.connectDisconnectClicked.bind(this);
    this.renderGraph = this.renderGraph.bind(this);
  }

  componentDidMount() {

  }

  componentWillUnmount() {

  }

  connect(ipAddress) {
    this.ws = new WebSocket(`ws://${ipAddress}`);
    this.ws.binaryType = 'arraybuffer';

    if (this.state.wsClosing || this.state.wsOpen) {
      console.error('ws is in closing or closed state');
      return;
    }

    this.setState({
      wsConnecting: true,
      wsClosing: false,
    });

    this.ws.onopen = () => {
      console.log('WebSocket open');
      this.setState({
        wsOpen: true,
        wsConnecting: false,
        wsClosing: false,
      });
    };

    this.ws.onclose = () => {
      console.log('WebSocket close');
      this.setState({
        wsOpen: false,
        wsConnecting: false,
        wsClosing: false,
      });    
    };

    this.ws.onerror = (evt) => {
      console.log(evt);
      this.setState({
        wsOpen: false,
        wsConnecting: false,
        wsClosing: false
      });
    };

    this.ws.onmessage = (evt) => {
      // We expect 13 float values.
      if (evt.data.byteLength !== (13 * 4)) {
        console.log('Unexpected WS Bin length', evt.data.byteLength);
        return;
      };
      
      const values = new Float32Array(evt.data);
      const data = {
        temp: values[0],
        accX: values[1],
        accY: values[2],
        accZ: values[3],
        gyroX: values[4],
        gyroY: values[5],
        gyroZ: values[6],
        gyroAngleX: values[7],
        gyroAngleY: values[8],
        gyroAngleZ: values[9],
        angleX: values[10],
        angleY: values[11],
        angleZ: values[12],
        dateTime: new Date(),
      };

      console.log(data);
      this.setState({
        data: [...this.state.data, data].filter(this.removeOldData)
      });
    };
  }

  removeOldData(data) {
    const now = new Date();
    return data.dateTime > new Date(now.getTime() - 10 * 1000);
  }

  connectDisconnectClicked(ipAddress) {
    if (this.state.wsOpen) {
      this.setState({
        wsClosing: true,
      });
      this.ws.close();
    } else {
      this.connect(ipAddress);
    }
  }

  renderGraph(gridKey, title, dataKeys) {
    return (
      <div key={gridKey} >
        <ResponsiveContainer>
          <LineChart 
            data={this.state.data}
            margin={{
              top: 0, right: 0, left: 0, bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis tick={false} >
              <Label value={title} offset={0} style={{fill: 'green', fontSize: '1.4em'}} position="insideLeft" />
            </XAxis>
            <YAxis />
            <Tooltip />
            {dataKeys.map((dataKey, i) => {
              return <Line key={dataKey} type="monotone" dataKey={dataKey} stroke={lineColors[i % lineColors.length]} fill={lineColors[i % lineColors.length]} />
            })}
          </LineChart >
        </ResponsiveContainer>
      </div>
    );
  }

  generateLayout() {
    return  [
      {i: 'g0', x: 0, y: 0, w: 8, h: 2},
      {i: 'g1', x: 8, y: 0, w: 4, h: 2},
      {i: 'g2', x: 0, y: 4, w: 4, h: 2},
      {i: 'g3', x: 4, y: 8, w: 4, h: 2},
      {i: 'g4', x: 8, y: 8, w: 4, h: 2},
    ];
  }

  render() {
    return (
      <div className="drawArea" ref="drawArea" >
        <Col className="Container">
        <ReactGridLayout
          layout={this.generateLayout()}
          onLayoutChange={this.onLayoutChange}
          {...this.props}
        >
          {this.renderGraph('g0', 'Gyro', ['gyroX', 'gyroY', 'gyroZ'])}
          {this.renderGraph('g1', 'Acc', ['accX', 'accY', 'accZ'])}
          {this.renderGraph('g2', 'Temperature', ['temp'])}
          {this.renderGraph('g3', 'GyroAngle', ['gyroAngleX', 'gyroAngleY', 'gyroAngleZ'])}
          {this.renderGraph('g4', 'Angle', ['angleX', 'angleY', 'angleZ'])}
        </ReactGridLayout>
          <Row xs={2}>
            <Toolbar
              isConnected={this.state.wsOpen}
              isConnecting={this.state.wsConnecting}
              onConnectDisconnect={this.connectDisconnectClicked}
              />
          </Row>
        </Col>
      </div>
    );
  }
}


