import debug from 'debug';

import { BaseSystemRoleProvider } from '../base/BaseSystemRoleProvider';
import type { PipelineContext, ProcessorOptions } from '../types';

declare module '../types' {
  interface PipelineContextMetadataOverrides {
    onboardingContextInjected?: boolean;
  }
}

const log = debug('context-engine:provider:OnboardingContextInjector');

export interface OnboardingContext {
  /** User persona document content (markdown) */
  personaContent?: string | null;
  /** Formatted phase guidance from getOnboardingState */
  phaseGuidance: string;
  /** SOUL.md document content */
  soulContent?: string | null;
}

export interface OnboardingContextInjectorConfig {
  enabled?: boolean;
  onboardingContext?: OnboardingContext;
}

/**
 * Onboarding Context Injector
 * Appends onboarding phase guidance and document contents to the system message.
 * Replaces the need for LLM to call getOnboardingState and readDocument tools.
 * Should run after SystemRoleInjector in the pipeline.
 */
export class OnboardingContextInjector extends BaseSystemRoleProvider {
  readonly name = 'OnboardingContextInjector';

  constructor(
    private config: OnboardingContextInjectorConfig,
    options: ProcessorOptions = {},
  ) {
    super(options);
  }

  protected buildSystemRoleContent(_context: PipelineContext): string | null {
    if (!this.config.enabled || !this.config.onboardingContext?.phaseGuidance) {
      log('Disabled or no phaseGuidance configured, skipping injection');
      return null;
    }

    const { onboardingContext } = this.config;
    const parts: string[] = [onboardingContext.phaseGuidance];

    if (onboardingContext.soulContent) {
      parts.push(
        `<current_soul_document>\n${onboardingContext.soulContent}\n</current_soul_document>`,
      );
    }

    if (onboardingContext.personaContent) {
      parts.push(
        `<current_user_persona>\n${onboardingContext.personaContent}\n</current_user_persona>`,
      );
    }

    return parts.join('\n\n');
  }

  protected onInjected(context: PipelineContext): void {
    context.metadata.onboardingContextInjected = true;
  }
}
