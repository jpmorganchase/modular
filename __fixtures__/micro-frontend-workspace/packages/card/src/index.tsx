import React, { useEffect, useState } from 'react';
import { Profile } from './components';
import { Person } from './types';

const PERSON: Person = {
  avatar: '',
  first_name: '',
  last_name: '',
  username: '',
};

export default function EsmView(): JSX.Element {
  const person = usePerson();

  return <Profile person={person} />;
}

function usePerson() {
  const [person, setPerson] = useState(PERSON);

  useEffect(() => {
    const listener = function (
      e: MessageEvent<{ broadcast: 'person'; person: Person }>,
    ) {
      if (e.data?.broadcast === 'person') {
        setPerson(e.data.person || PERSON);
      }
    };

    window.addEventListener('message', listener);

    return () => window.removeEventListener('message', listener);
  }, [setPerson]);

  return person;
}
