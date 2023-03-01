import * as e from 'https://esm.sh/react@18.2.0';
import * as t from 'https://esm.sh/@mantine/core@5.10.4';
import * as a from 'https://esm.sh/minifaker@1.34.1';
import * as r from 'https://esm.sh/minifaker@1.34.1/locales/en';
var n = {
    d: (e, t) => {
      for (var a in t)
        n.o(t, a) &&
          !n.o(e, a) &&
          Object.defineProperty(e, a, { enumerable: !0, get: t[a] });
    },
    o: (e, t) => Object.prototype.hasOwnProperty.call(e, t),
  },
  m = {};
n.d(m, { Z: () => c });
const o = ((e) => {
  var t = {};
  return n.d(t, e), t;
})({
  createElement: () => e.createElement,
  default: () => e.default,
  useState: () => e.useState,
});
const l = ((e) => {
  var t = {};
  return n.d(t, e), t;
})({
  Avatar: () => t.Avatar,
  Badge: () => t.Badge,
  Button: () => t.Button,
  Card: () => t.Card,
  Group: () => t.Group,
  MantineProvider: () => t.MantineProvider,
  Text: () => t.Text,
  useMantineTheme: () => t.useMantineTheme,
});
const s = ((e) => {
  var t = {};
  return n.d(t, e), t;
})({
  cityName: () => a.cityName,
  default: () => a.default,
  domainName: () => a.domainName,
  jobTitle: () => a.jobTitle,
  month: () => a.month,
  name: () => a.name,
  number: () => a.number,
  streetAddress: () => a.streetAddress,
});
const d = ((e) => {
  var t = {};
  return n.d(t, e), t;
})({ default: () => r.default });
function i() {
  const e = (0, l.useMantineTheme)(),
    t = (0, o.useState)({})[1],
    a = 'dark' === e.colorScheme ? e.colors.dark[1] : e.colors.gray[7],
    r = Math.random() > 0.5 ? 'female' : 'male',
    n = 'female' === r ? 'women' : 'men';
  return o.default.createElement(
    'div',
    { className: 'card-component' },
    o.default.createElement(
      l.Card,
      { className: 'card', shadow: 'sm', withBorder: !0 },
      o.default.createElement(
        l.Group,
        {
          position: 'apart',
          className: 'group',
          style: { marginTop: e.spacing.sm },
        },
        o.default.createElement(
          l.Group,
          { className: 'group', style: { marginTop: e.spacing.sm } },
          o.default.createElement(l.Avatar, {
            src: `https://randomuser.me/api/portraits/${n}/${(0, s.number)({
              min: 0,
              max: 99,
            })}.jpg`,
            alt: 'User',
            color: 'indigo',
          }),
          o.default.createElement(
            l.Text,
            { weight: 500 },
            (0, s.name)({ gender: r }),
          ),
        ),
        o.default.createElement(
          l.Badge,
          { color: 'pink', variant: 'light' },
          (0, s.domainName)(),
        ),
      ),
      o.default.createElement(
        l.Text,
        { size: 'sm', style: { color: a, lineHeight: 2.5 } },
        o.default.createElement(l.Text, { size: 'sm', color: 'dimmed' }, 'Job'),
        (0, s.jobTitle)(),
        o.default.createElement(
          l.Text,
          { size: 'sm', color: 'dimmed' },
          'Address',
        ),
        (0, s.streetAddress)(),
        ', ',
        (0, s.cityName)(),
        o.default.createElement(
          l.Text,
          { size: 'sm', color: 'dimmed' },
          'Started',
        ),
        (0, s.month)(),
        ' ',
        (0, s.number)({ min: 2e3, max: 2021 }),
      ),
      o.default.createElement(
        l.Button,
        {
          variant: 'light',
          color: 'blue',
          fullWidth: !0,
          className: 'button',
          onClick: t,
        },
        'Generate another profile',
      ),
    ),
  );
}
s.default.addLocale('en', d.default);
const u = o.default.memo(function () {
  return o.default.createElement(
    l.MantineProvider,
    { withGlobalStyles: !0, withNormalizeCSS: !0 },
    o.default.createElement(i, null),
  );
});
function c() {
  return o.createElement(u, null);
}
var f = m.Z;
export { f as default };
//# sourceMappingURL=main.8285d3ce.js.map
