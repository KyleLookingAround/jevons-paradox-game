import type { Layout } from '../layout';
import { genericLayout } from './generic';
export const compute: Layout = { ...genericLayout(5), id: 'compute' };
