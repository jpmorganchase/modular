import React, { useState } from 'react';
import {
  Card,
  Text,
  Badge,
  Button,
  Group,
  Avatar,
  useMantineTheme,
  MantineProvider,
} from '@mantine/core';
import {
  default as minifaker,
  name,
  jobTitle,
  streetAddress,
  cityName,
  domainName,
  month,
  number,
} from 'minifaker';
/* @ts-expect-error */
import { default as en } from 'minifaker/locales/en';
import './index.css';

minifaker.addLocale('en', en);

function AppInner(): JSX.Element {
  const theme = useMantineTheme();
  const refresh = useState({})[1];

  const secondaryColor =
    theme.colorScheme === 'dark' ? theme.colors.dark[1] : theme.colors.gray[7];

  const gender = Math.random() > 0.5 ? 'female' : 'male';
  const apiGender = gender === 'female' ? 'women' : 'men';

  return (
    <div className="card-component">
      <Card className="card" shadow="sm" withBorder={true}>
        <Group
          position="apart"
          className="group"
          style={{ marginTop: theme.spacing.sm }}
        >
          <Group className="group" style={{ marginTop: theme.spacing.sm }}>
            <Avatar
              src={`https://randomuser.me/api/portraits/${apiGender}/${number({
                min: 0,
                max: 99,
              })}.jpg`}
              alt="User"
              color="indigo"
            />
            <Text weight={500}>{name({ gender })}</Text>
          </Group>
          <Badge color="pink" variant="light">
            {domainName()}
          </Badge>
        </Group>

        <Text size="sm" style={{ color: secondaryColor, lineHeight: 2.5 }}>
          <Text size="sm" color="dimmed">
            Job
          </Text>
          {jobTitle()}
          <Text size="sm" color="dimmed">
            Address
          </Text>
          {streetAddress()}, {cityName()}
          <Text size="sm" color="dimmed">
            Started
          </Text>
          {month()} {number({ min: 2000, max: 2021 })}
        </Text>

        <Button
          variant="light"
          color="blue"
          fullWidth
          className="button"
          onClick={refresh}
        >
          Generate another profile
        </Button>
      </Card>
    </div>
  );
}

export default React.memo(function App() {
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <AppInner />
    </MantineProvider>
  );
});
