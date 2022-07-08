# Visit-ReactNative

a custom webview component that injects data into visit pwa through native modules and events

## Installation

```sh
yarn add https://github.com/VisitApp/Visit-ReactNative && npx pod-install
```

## Usage

```js
import VisitHealthView from 'Visit-ReactNative';

// ...


export default function App() {
  return <VisitHealthView
    baseUrl='base_url_for_pwa'
    token='authencation_token'
    id='user_id'
    phone='user_phone'
  />
}

```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
