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

  it('should inject onboarding context before the first user message', async () => {
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

    expect(result.messages).toHaveLength(3);
    expect(result.messages[0].content).toBe('System role');
    expect(result.messages[1]).toMatchObject({
      meta: { systemInjection: true },
      role: 'user',
    });
    expect(result.messages[1].content).toBe(`<onboarding_context>
<phase>collect-profile</phase>

<current_soul_document>
# SOUL
</current_soul_document>

<current_user_persona>
# Persona
</current_user_persona>
</onboarding_context>`);
    expect(result.messages[2].content).toBe('Hello');
  });

  it('should append to an existing before-first-user injection message', async () => {
    const provider = new OnboardingContextInjector({
      enabled: true,
      onboardingContext: {
        phaseGuidance: '<phase>collect-profile</phase>',
      },
    });

    const result = await provider.process(
      createContext([
        { content: 'System role', role: 'system' },
        {
          content: '<knowledge_context>Docs</knowledge_context>',
          meta: { systemInjection: true },
          role: 'user',
        },
        { content: 'Hello', role: 'user' },
      ]),
    );

    expect(result.messages).toHaveLength(3);
    expect(result.messages[1].content).toBe(`<knowledge_context>Docs</knowledge_context>

<onboarding_context>
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
        {
          content: '<onboarding_context>\n<phase>existing</phase>\n</onboarding_context>',
          meta: { systemInjection: true },
          role: 'user',
        },
        { content: 'Hello', role: 'user' },
      ]),
    );

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].content).toContain('<phase>existing</phase>');
    expect(result.messages[1].content).toBe('Hello');
  });
});
