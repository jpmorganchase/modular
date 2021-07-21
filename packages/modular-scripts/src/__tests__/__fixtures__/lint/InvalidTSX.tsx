//@ts-nocheck
/* eslint-disable */

import { useEffect } from 'react';

export function BadComponent(props) {
  if (props.name) {
    useEffect(function logMe() {
      console.log('Me!');
    });
  }
}
