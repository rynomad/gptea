import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Button, Intent } from '@blueprintjs/core';
import { BrokerClient as Client } from '../../client';

import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';

const Ping = () => {
  const [bgColor, setBgColor] = useState('#FFF');

  const handleButtonClick = () => {
    const client1 = new Client();
    const client2 = new Client();

    client1.on('pong', () => {
      setBgColor('green');
    });

    client2.on('ping', (payload) => {
      console.log('client2 received ping message: ', payload)
      client2.dispatch({
        type: 'pong',
        payload
      });
    });

    client1.dispatch({
      type: 'ping',
      payload: 'Ping message'
    });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: bgColor }}>
      <Button onClick={handleButtonClick} intent={Intent.PRIMARY}>
        Start
      </Button>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  // @ts-ignore
  ReactDOM.createRoot(rootElement).render(<Ping />);
}
