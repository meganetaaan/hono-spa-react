import { Hono } from 'hono'
import { renderToString } from 'react-dom/server'
import rclnodejs from 'rclnodejs'
import { streamSSE } from 'hono/streaming'

declare module globalThis {
  let node: rclnodejs.Node | null
  let publisher: rclnodejs.Publisher<"std_msgs/msg/String"> | null
}

try {
  await rclnodejs.init();
} catch (e) {
  if (e != null && typeof e === "object" && "message" in e) {
    console.warn(e?.message);
  }
}

if (globalThis.node != null) {
  globalThis.node.destroy();
}
const node = globalThis.node = new rclnodejs.Node("hono")
node.spin()
const app = new Hono()

/**
 * トピックを発行する
 */
app.post('/api/publish', async (c) => {
  const message = await c.req.json()
  const publisher = node.createPublisher("std_msgs/msg/String", "hello")
  publisher.publish({
    data: JSON.stringify(message)
  })
  node.destroyPublisher(publisher)
  return c.json({
    success: true
  })
})

/**
 * トピックを購読する
 */
let count = 0;
app.get('/api/subscribe', async (c) => {
  const num = count++
  console.log(`subscribing from ${c.req.url}: ${num}`)
  return streamSSE(c, async (stream) => {
    return new Promise((resolve, reject) => {
      const sub = node.createSubscription("std_msgs/msg/String", "hello", async (message) => {
        await stream.writeSSE({
          data: JSON.stringify(message)
        })
      })
      stream.onAbort(() => {
        console.log(`destroy ${num}`)
        node.destroySubscription(sub)
        stream.close()
        reject()
      })

    })
  })
})

app.get('/api/clock', (c) => {
  return c.json({
    time: new Date().toLocaleTimeString()
  })
})

app.get('*', (c) => {
  return c.html(
    renderToString(
      <html>
        <head>
          <meta charSet="utf-8" />
          <meta content="width=device-width, initial-scale=1" name="viewport" />
          <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css" />
          {import.meta.env.PROD ? (
            <script type="module" src="/static/client.js"></script>
          ) : (
            <script type="module" src="/src/client.tsx"></script>
          )}
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>
    )
  )
})

export default app
