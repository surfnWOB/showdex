/**
 * @file `MarkdownPlugin.tsx`
 * @author Keith Choison <keith@tize.io>
 * @since 1.3.0
 */

import * as React from 'react';
import { MarkdownShortcutPlugin as LexicalMarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS as MarkdownTransformers } from '@lexical/markdown';

export const MarkdownPlugin = (): JSX.Element => (
  <LexicalMarkdownShortcutPlugin transformers={MarkdownTransformers} />
);
