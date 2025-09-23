/**
 * @file `Notedex.tsx`
 * @author Keith Choison <keith@tize.io>
 * @since 1.3.0
 */

import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDebouncyFn } from 'use-debouncy';
import cx from 'classnames';
import { useDurationFormatter } from '@showdex/components/calc/BattleInfo';
import { BuildInfo } from '@showdex/components/debug';
import { Composer, InlineField } from '@showdex/components/form';
import { Card, PageContainer } from '@showdex/components/layout';
import { ToggleButton } from '@showdex/components/ui';
import { saveNotedex } from '@showdex/redux/actions';
import { notedexSlice, useDispatch, useNotedexInstance } from '@showdex/redux/store';
import { formatId, tolerance } from '@showdex/utils/core';
import { logger } from '@showdex/utils/debug';
import { useElementSize } from '@showdex/utils/hooks';
import styles from './Notedex.module.scss';

export interface NotedexProps {
  instanceId: string;
  saveDebounce?: number;
  updateDebounce?: number;
  // onRequestHellodex?: () => void;
  onLeaveRoom?: () => void;
}

const l = logger('@showdex/pages/Notedex');

export const Notedex = ({
  instanceId,
  saveDebounce = 3000,
  updateDebounce = 1000,
  // onRequestHellodex,
  onLeaveRoom,
}: NotedexProps): JSX.Element => {
  const { t } = useTranslation('notedex');
  const state = useNotedexInstance(instanceId);
  const dispatch = useDispatch();

  const contentRef = React.useRef<HTMLDivElement>(null);
  const { width, height, size } = useElementSize(contentRef, {
    initialWidth: 320,
    initialHeight: 700,
  });

  React.useEffect(() => {
    if (
      !width
        || !height
        || !size
        || (size === state?.containerSize && tolerance(state.containerWidth, 10)(width))
    ) {
      return;
    }

    dispatch(notedexSlice.actions.update({
      scope: l.scope,
      id: instanceId,
      containerSize: size,
      containerWidth: width,
    }));
  }, [
    dispatch,
    height,
    instanceId,
    size,
    state?.containerSize,
    state?.containerWidth,
    width,
  ]);

  const [saving, setSaving] = React.useState(false);
  const saved = React.useMemo(() => !saving && !!state?.saved, [saving, state?.saved]);
  const saveRequestTimeout = React.useRef<NodeJS.Timeout>(null);

  const formatDuration = useDurationFormatter();
  const savedAgo = React.useMemo(() => formatDuration(state?.saved), [formatDuration, state?.saved]);
  const saveLabel = React.useMemo(() => (
    saving
      ? t('toolbar.save.saving')
      : state?.saved > 0
        ? Date.now() - state.saved < 60000 || formatId(savedAgo)?.startsWith('lessthan')
          ? t('toolbar.save.savedRecently')
          : t('toolbar.save.savedAgo', { ago: savedAgo })
        : t('toolbar.save.unsaved')
  ).trim(), [
    savedAgo,
    saving,
    state?.saved,
    t,
  ]);

  const saveNote = React.useCallback(() => {
    if (saveRequestTimeout.current) {
      clearTimeout(saveRequestTimeout.current);
    }

    setSaving(true);

    saveRequestTimeout.current = setTimeout(() => void (async () => {
      await dispatch(saveNotedex({ id: instanceId }));
      setSaving(false);
      saveRequestTimeout.current = null;
    })(), saveDebounce);
  }, [
    dispatch,
    instanceId,
    saveDebounce,
  ]);

  const updateNote = React.useCallback((
    payload: Partial<typeof state>,
    scope?: string,
  ) => {
    dispatch(notedexSlice.actions.update({
      ...payload,
      id: instanceId,
      scope: `${l.scope}:${instanceId}:updateNote() via ${scope || '(anon)'}`,
    }));

    if (!state?.name && !payload?.name) {
      return;
    }

    saveNote();
  }, [
    dispatch,
    instanceId,
    saveNote,
    state?.name,
  ]);

  const debouncyUpdateNote = useDebouncyFn(updateNote, updateDebounce);

  return (
    <PageContainer
      contentRef={contentRef}
      name="notedex"
      className={styles.container}
      prefix={<BuildInfo className={styles.buildInfo} position="top-right" />}
      contentScrollable
    >
      <Card className={styles.toolbar}>
        <InlineField
          className={styles.noteName}
          hint={t('toolbar.name.hint') as React.ReactNode}
          input={{
            name: `${l.scope}:${instanceId}:Name`,
            value: state?.name,
            onChange: (value: string) => void debouncyUpdateNote({
              name: value,
            }, `${l.scope}:${instanceId}:Name~InlineField:input.onChange()`),
          }}
        />

        <div className={styles.noteActions}>
          <ToggleButton
            className={cx(styles.actionButton, saved && styles.saved)}
            label={saveLabel}
            tooltip={(
              <Trans
                t={t}
                i18nKey="toolbar.save.tooltip"
                parent="div"
                className={styles.tooltipContent}
                shouldUnescape
              />
            )}
            absoluteHover
            active={saving}
            disabled={saving || !state?.name}
            onPress={saveNote}
          />

          <ToggleButton
            className={styles.actionButton}
            label={t('toolbar.close.label')}
            tooltip={(
              <Trans
                t={t}
                i18nKey="toolbar.close.tooltip"
                parent="div"
                className={styles.tooltipContent}
                shouldUnescape
              />
            )}
            absoluteHover
            onPress={onLeaveRoom}
          />
        </div>
      </Card>

      <Composer
        className={styles.editor}
        hint={t('editor.hint')}
        initialEditorState={state?.editorState}
        input={{
          name: `${l.scope}:${instanceId}:EditorState`,
          value: state?.editorState,
          onChange: (value: string) => void debouncyUpdateNote({
            editorState: value,
          }, `${l.scope}:${instanceId}:EditorState~Composer:input.onChange()`),
        }}
      />
    </PageContainer>
  );
};
