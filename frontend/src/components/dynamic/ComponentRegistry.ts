import React from 'react';
import { WidgetType } from '@/types';

import StatsGridWidget from './widgets/StatsGridWidget';
import MoodDialWidget from './widgets/MoodDialWidget';
import BreathingBubbleWidget from './widgets/BreathingBubbleWidget';
import DataTableWidget from './widgets/DataTableWidget';
import SchemaFormGenerator from './SchemaFormGenerator';

export const COMPONENT_REGISTRY: Record<WidgetType, React.ComponentType<any>> = {
  STATS_GRID: StatsGridWidget,
  MOOD_DIAL: MoodDialWidget,
  BREATHING_BUBBLE: BreathingBubbleWidget,
  DATA_TABLE: DataTableWidget,
  FORM_GENERATOR: SchemaFormGenerator,
};
