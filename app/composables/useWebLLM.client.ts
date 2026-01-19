// Dynamic import to avoid SSR issues with large WebLLM library
type MLCEngine = Awaited<ReturnType<typeof import('@mlc-ai/web-llm')['CreateMLCEngine']>>
type InitProgressReport = Parameters<NonNullable<Parameters<typeof import('@mlc-ai/web-llm')['CreateMLCEngine']>[1]>['initProgressCallback']>[0]

export type WebLLMStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'error' | 'unsupported'

export interface WebLLMProgress {
  phase: 'init' | 'download' | 'load' | 'ready'
  progress: number // 0-100
  text: string
  downloadedMB?: number
  totalMB?: number
}

// Use Phi-3-mini - smallest viable model, good quality
const MODEL_ID = 'Phi-3.5-mini-instruct-q4f16_1-MLC'
const MODEL_SIZE_MB = 1400 // Approximate size for progress display

// Singleton engine - persists across component lifecycles
let engineInstance: MLCEngine | null = null
let enginePromise: Promise<MLCEngine> | null = null

export function useWebLLM() {
  const status = ref<WebLLMStatus>('idle')
  const progress = ref<WebLLMProgress>({
    phase: 'init',
    progress: 0,
    text: 'Initializing...'
  })
  const error = ref<string | null>(null)
  const isSupported = ref(true)

  // Check WebGPU support
  function checkSupport(): boolean {
    if (typeof navigator === 'undefined') return false
    if (!('gpu' in navigator)) {
      isSupported.value = false
      status.value = 'unsupported'
      error.value = 'WebGPU not supported. Try Chrome 113+ or Edge 113+.'
      return false
    }
    return true
  }

  // Initialize the engine (downloads model if needed)
  async function initialize(): Promise<boolean> {
    // Already ready
    if (engineInstance && status.value === 'ready') {
      return true
    }

    // Already loading - wait for it
    if (enginePromise) {
      try {
        await enginePromise
        status.value = 'ready'
        return true
      } catch {
        return false
      }
    }

    if (!checkSupport()) return false

    status.value = 'loading'
    error.value = null
    progress.value = {
      phase: 'init',
      progress: 0,
      text: 'Checking browser capabilities...'
    }

    try {
      // Dynamic import to avoid SSR bundling issues
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm')

      enginePromise = CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report) => {
          // Parse the progress report
          const progressPercent = Math.round(report.progress * 100)

          // Determine phase from text
          let phase: WebLLMProgress['phase'] = 'init'
          const reportText = report.text || 'Loading...'
          let text = reportText
          let downloadedMB: number | undefined
          let totalMB: number | undefined

          if (text.includes('Fetching') || text.includes('Loading model')) {
            phase = 'download'
            // Try to extract download progress
            const match = text.match(/(\d+(?:\.\d+)?)\s*MB/)
            if (match && match[1]) {
              downloadedMB = parseFloat(match[1])
              totalMB = MODEL_SIZE_MB
            }
          } else if (text.includes('Loading GPU')) {
            phase = 'load'
            text = 'Loading model into GPU memory...'
          } else if (progressPercent >= 100) {
            phase = 'ready'
            text = 'AI ready!'
          }

          progress.value = {
            phase,
            progress: progressPercent,
            text,
            downloadedMB,
            totalMB
          }
        }
      })

      engineInstance = await enginePromise
      status.value = 'ready'
      progress.value = {
        phase: 'ready',
        progress: 100,
        text: 'AI ready!'
      }
      return true
    } catch (e) {
      console.error('WebLLM initialization failed:', e)
      status.value = 'error'
      error.value = e instanceof Error ? e.message : 'Failed to load AI model'
      enginePromise = null
      return false
    }
  }

  // Generate explanation
  async function generate(prompt: string): Promise<string> {
    if (!engineInstance) {
      throw new Error('Engine not initialized. Call initialize() first.')
    }

    status.value = 'generating'

    try {
      const response = await engineInstance.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are Dewey, a friendly water droplet mascot who explains Sui blockchain transactions in a clear, helpful way. Keep explanations concise (2-3 sentences). Be warm and approachable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })

      status.value = 'ready'
      return response.choices[0]?.message?.content || ''
    } catch (e) {
      status.value = 'error'
      error.value = e instanceof Error ? e.message : 'Generation failed'
      throw e
    }
  }

  // Stream generation for better UX
  async function* generateStream(prompt: string): AsyncGenerator<string> {
    if (!engineInstance) {
      throw new Error('Engine not initialized. Call initialize() first.')
    }

    status.value = 'generating'

    try {
      const stream = await engineInstance.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are Dewey, a friendly water droplet mascot who explains Sui blockchain transactions in a clear, helpful way. Keep explanations concise (2-3 sentences). Be warm and approachable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
        stream: true
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }

      status.value = 'ready'
    } catch (e) {
      status.value = 'error'
      error.value = e instanceof Error ? e.message : 'Generation failed'
      throw e
    }
  }

  // Check if model is cached (fast check without full init)
  async function isCached(): Promise<boolean> {
    // WebLLM caches in IndexedDB - check if our model exists
    try {
      const caches = await window.caches?.keys()
      return caches?.some(name => name.includes('webllm')) || false
    } catch {
      return false
    }
  }

  // Reset/clear the engine
  function reset() {
    engineInstance = null
    enginePromise = null
    status.value = 'idle'
    progress.value = {
      phase: 'init',
      progress: 0,
      text: 'Initializing...'
    }
    error.value = null
  }

  return {
    // State
    status: readonly(status),
    progress: readonly(progress),
    error: readonly(error),
    isSupported: readonly(isSupported),

    // Actions
    initialize,
    generate,
    generateStream,
    isCached,
    checkSupport,
    reset
  }
}
