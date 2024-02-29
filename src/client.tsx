import { createRoot } from 'react-dom/client'
import { useCallback, useEffect, useState } from 'react'
import { MessagesMap } from 'rclnodejs'

function App() {
  return (
    <>
      <h1>Hello, Hono with React!</h1>
      <h2>Example of useState()</h2>
      <Counter />
      <h2>Example of API fetch()</h2>
      <ClockButton />
    </>
  )
}

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>You clicked me {count} times</button>
}

/**
 * トピックを購読する
 * @param topicName トピック名
 * @param topicType トピックの型名
 * @param callback コールバック
 */
function subscribe<T extends keyof MessagesMap>(topicName: string, topicType: T, callback: (message: MessagesMap[T]) => unknown) {
  // TODO: 任意のトピックを購読する
  // TODO: エラーハンドリング
  const source = new EventSource('/api/sse')
  source.onerror = (error => {
    debugger
  })
  source.onmessage = (message => {
    console.log(message)
    const newMsg = JSON.parse(message.data) as MessagesMap[T]
    callback(newMsg)
  })

}

/**
 * トピックを発行する
 * @param topicName トピック名
 * @param topicType トピックの型名
 * @param callback コールバック
 */
async function publish<T extends keyof MessagesMap>(topicName: string, topicType: T, message: MessagesMap[T]) {
  // TODO: 任意のトピックを発行する
  // TODO: エラーハンドリング
  const response = await fetch('/api/publish', {
    body: JSON.stringify({ message }),
    method: 'POST'
  })
  return await response.json()
}

const ClockButton = () => {
  const [response, setResponse] = useState<string | null>(null)
  const [text, setText] = useState<string>("")
  const [messages, setMessages] = useState<string>("")

  useEffect(() => {
    let msg = messages
    subscribe("hello", "std_msgs/msg/String", (message) => {
      msg += message.data
      setMessages(msg)
    })
  }, []);

  const handleSendButtonClick = useCallback(async () => {
    const result = await publish("hello", "std_msgs/msg/String", { data: text })
    console.log(result)
  }, [text]);

  const handleClick = async () => {
    const response = await fetch('/api/clock')
    const data = await response.json()
    const headers = Array.from(response.headers.entries()).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
    const fullResponse = {
      url: response.url,
      status: response.status,
      headers,
      body: data
    }
    setResponse(JSON.stringify(fullResponse, null, 2))
  }

  return (
    <div>
      <button onClick={handleClick}>Get Server Time</button>
      {response && <pre>{response}</pre>}
      <input type="text" value={text} onChange={(e) => { setText(e.target.value) }}></input>
      <button onClick={handleSendButtonClick}>send</button>
      <div>{messages}</div>
    </div>
  )
}

const domNode = document.getElementById('root')!
const root = createRoot(domNode)
root.render(<App />)
