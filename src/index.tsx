import type { VisitRnSdkViewProps } from './types';

export type { VisitRnSdkViewProps } from './types';

/**
 * Platform-neutral entry used by TypeScript and react-native-builder-bob.
 * Metro resolves `src/index` to `index.android.tsx` / `index.ios.tsx` at runtime,
 * so this file only exists to publish shared typings.
 *
 * Return type is intentionally loose so host apps on different React /
 * `@types/react` versions can use this as a JSX component without
 * conflicting ReactElement definitions.
 */
declare function VisitRnSdkView(props: VisitRnSdkViewProps): any;

export default VisitRnSdkView;
