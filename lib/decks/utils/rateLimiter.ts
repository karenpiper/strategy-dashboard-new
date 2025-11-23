/**
 * Rate limiter utility for OpenAI API calls
 * Prevents hitting rate limits by queuing and delaying requests
 */

interface RateLimiterOptions {
  maxRequestsPerMinute?: number
  maxRequestsPerSecond?: number
  delayBetweenRequests?: number // milliseconds
}

class RateLimiter {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private requestTimes: number[] = []
  private options: Required<RateLimiterOptions>

  constructor(options: RateLimiterOptions = {}) {
    this.options = {
      maxRequestsPerMinute: options.maxRequestsPerMinute || 50, // OpenAI default is 60/min for tier 1
      maxRequestsPerSecond: options.maxRequestsPerSecond || 3, // Conservative: 3 per second
      delayBetweenRequests: options.delayBetweenRequests || 350, // ~3 requests per second
    }
  }

  /**
   * Add a request to the queue and execute it when rate limits allow
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      // Check rate limits
      await this.waitIfNeeded()

      // Remove old request times (older than 1 minute)
      const oneMinuteAgo = Date.now() - 60000
      this.requestTimes = this.requestTimes.filter((time) => time > oneMinuteAgo)

      // Check if we've exceeded per-minute limit
      if (this.requestTimes.length >= this.options.maxRequestsPerMinute) {
        const oldestRequest = Math.min(...this.requestTimes)
        const waitTime = 60000 - (Date.now() - oldestRequest) + 1000 // Add 1 second buffer
        if (waitTime > 0) {
          console.log(`Rate limit: waiting ${Math.ceil(waitTime / 1000)}s before next request`)
          await this.sleep(waitTime)
        }
      }

      // Check if we've exceeded per-second limit
      const oneSecondAgo = Date.now() - 1000
      const recentRequests = this.requestTimes.filter((time) => time > oneSecondAgo).length
      if (recentRequests >= this.options.maxRequestsPerSecond) {
        const oldestRecentRequest = this.requestTimes
          .filter((time) => time > oneSecondAgo)
          .sort()[0]
        const waitTime = 1000 - (Date.now() - oldestRecentRequest) + 100 // Add 100ms buffer
        if (waitTime > 0) {
          await this.sleep(waitTime)
        }
      }

      // Execute the next request
      const request = this.queue.shift()
      if (request) {
        this.requestTimes.push(Date.now())
        await request()
        
        // Add delay between requests
        if (this.queue.length > 0) {
          await this.sleep(this.options.delayBetweenRequests)
        }
      }
    }

    this.processing = false
  }

  private async waitIfNeeded() {
    // Check per-minute limit
    const oneMinuteAgo = Date.now() - 60000
    const requestsInLastMinute = this.requestTimes.filter((time) => time > oneMinuteAgo).length

    if (requestsInLastMinute >= this.options.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requestTimes)
      const waitTime = 60000 - (Date.now() - oldestRequest) + 1000
      if (waitTime > 0) {
        await this.sleep(waitTime)
      }
    }

    // Check per-second limit
    const oneSecondAgo = Date.now() - 1000
    const requestsInLastSecond = this.requestTimes.filter((time) => time > oneSecondAgo).length

    if (requestsInLastSecond >= this.options.maxRequestsPerSecond) {
      await this.sleep(this.options.delayBetweenRequests)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Global rate limiter instance
let globalRateLimiter: RateLimiter | null = null

/**
 * Get or create the global rate limiter
 */
export function getRateLimiter(options?: RateLimiterOptions): RateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(options)
  }
  return globalRateLimiter
}

/**
 * Execute a function with rate limiting
 */
export async function rateLimited<T>(fn: () => Promise<T>, options?: RateLimiterOptions): Promise<T> {
  const limiter = options ? new RateLimiter(options) : getRateLimiter()
  return limiter.execute(fn)
}



