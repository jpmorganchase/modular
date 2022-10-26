import React from 'react';

import { Person } from '../types';

import styles from './profile.module.css';

export function Profile({ person }: { person: Person }) {
  return (
    <dd className={styles.profileCard}>
      <dt>Avatar</dt>
      <dd>{person.avatar}</dd>
      <dt>Name</dt>
      <dd>
        {person.first_name} {person.last_name}
      </dd>
      <dt>Username</dt>
      <dd>{person.username}</dd>
    </dd>
  );
}
