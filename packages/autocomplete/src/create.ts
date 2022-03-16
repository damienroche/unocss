import type { UnoGenerator } from '@unocss/core'
import { toArray, uniq } from '@unocss/core'
import { parseAutocomplete } from './parse'
import type { ParsedAutocompleteTemplate } from './types'

export function createAutocomplete(uno: UnoGenerator) {
  const staticUtils = Object.keys(uno.config.rulesStaticMap)
  const templateCache = new Map<string, ParsedAutocompleteTemplate>()
  const templates = [
    ...uno.config.autocomplete || [],
    ...uno.config.rulesDynamic.flatMap(i => toArray(i?.[2]?.autocomplete || [])),
  ]

  function getParsed(template: string) {
    if (!templateCache.has(template))
      templateCache.set(template, parseAutocomplete(template, uno.config.theme))
    return templateCache.get(template)!.suggest
  }

  async function suggest(input: string) {
    if (input.length < 2)
      return []

    return await Promise.all([
      suggestSelf(input),
      suggestStatic(input),
      ...suggestFromPreset(input),
    ])
      .then(i => uniq(i.flat()).sort().filter(Boolean)) as string[]
  }

  async function suggestSelf(input: string) {
    const i = await uno.parseToken(input, '-')
    return i ? [input] : []
  }

  async function suggestStatic(input: string) {
    return staticUtils.filter(i => i.startsWith(input))
  }

  function suggestFromPreset(input: string) {
    return templates.map(fn =>
      typeof fn === 'function'
        ? fn(input)
        : getParsed(fn)(input),
    ) || []
  }

  return {
    suggest,
    templates,
  }
}
