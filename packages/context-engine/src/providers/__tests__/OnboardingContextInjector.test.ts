import { describe, expect, it } from 'vitest';

import type { PipelineContext } from '../../types';
import { OnboardingContextInjector } from '../OnboardingContextInjector';

describe('OnboardingContextInjector', () => {
  const createContext = (messages: any[]): PipelineContext => ({
    initialState: { messages: [] },
    isAborted: false,
    messages,
    metadata: {},
  });

  it('should append onboarding context to the last message when it is user', async () => {
    const provider = new OnboardingContextInjector({
      enabled: true,
      onboardingContext: {
        personaContent: '# Persona',
        phaseGuidance: '<phase>collect-profile</phase>',
        soulContent: '# SOUL',
      },
    });

    const result = await provider.process(
      createContext([
        { content: 'System role', role: 'system' },
        { content: 'Hello', role: 'user' },
      ]),
    );

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].content).toBe('System role');
    expect(result.messages[1].content).toBe(`Hello

<onboarding_context>
<phase>collect-profile</phase>

<current_soul_document>
# SOUL
</current_soul_document>

<current_user_persona>
# Persona
</current_user_persona>
</onboarding_context>`);
  });

  it('should create a synthetic tail user message when the last message is not user', async () => {
    const provider = new OnboardingContextInjector({
      enabled: true,
      onboardingContext: {
        phaseGuidance: '<phase>collect-profile</phase>',
      },
    });

    const result = await provider.process(
      createContext([
        { content: 'System role', role: 'system' },
        { content: 'Hello', role: 'user' },
        { content: 'Tool result', role: 'tool' },
      ]),
    );

    expect(result.messages).toHaveLength(4);
    expect(result.messages[3]).toMatchObject({
      meta: {
        injectType: 'OnboardingContextInjector',
        virtualLastUser: true,
      },
      role: 'user',
    });
    expect(result.messages[3].content).toBe(`<onboarding_context>
<phase>collect-profile</phase>
</onboarding_context>`);
  });

  it('should skip reinjection when onboarding context already exists in messages', async () => {
    const provider = new OnboardingContextInjector({
      enabled: true,
      onboardingContext: {
        phaseGuidance: '<phase>collect-profile</phase>',
      },
    });

    const result = await provider.process(
      createContext([
        { content: 'Hello', role: 'user' },
        {
          content: '<onboarding_context>\n<phase>existing</phase>\n</onboarding_context>',
          meta: { injectType: 'OnboardingContextInjector', virtualLastUser: true },
          role: 'user',
        },
      ]),
    );

    expect(result.messages).toHaveLength(2);
    expect(result.messages[1].content).toContain('<phase>existing</phase>');
  });
});
