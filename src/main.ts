import './style.css'
import { launchRuntimeZero } from './game'

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) {
  throw new Error('Missing #app root element.')
}

root.innerHTML = ''
launchRuntimeZero(root)
