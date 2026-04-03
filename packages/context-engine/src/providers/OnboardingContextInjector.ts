import debug from 'debug';

import { BaseVirtualLastUserContentProvider } from '../base/BaseVirtualLastUserContentProvider';
import type { PipelineContext, ProcessorOptions } from '../types';

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
 * Injects onboarding phase guidance and document contents at the virtual last-user position.
 * Replaces the need for LLM to call getOnboardingState and readDocument tools.
 */
export class OnboardingContextInjector extends BaseVirtualLastUserContentProvider {
  readonly name = 'OnboardingContextInjector';

  constructor(
    private config: OnboardingContextInjectorConfig,
    options: ProcessorOptions = {},
  ) {
    super(options);
  }

  protected shouldSkip(context: PipelineContext): boolean {
    const alreadyInjected = context.messages.some(
      (message) =>
        typeof message.content === 'string' && message.content.includes('<onboarding_context>'),
    );

    if (alreadyInjected) {
      log('Onboarding context already injected, skipping');
    }

    return alreadyInjected;
  }

  protected buildContent(_context: PipelineContext): string | null {
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

    return `<onboarding_context>\n${parts.join('\n\n')}\n</onboarding_context>`;
  }
}
