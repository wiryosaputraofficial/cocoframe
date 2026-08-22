import { defineLayout } from "@cocoframe/core";
import StarsMinimalisticIcon from "@cocoframe/icons/linear/stars-minimalistic";

export default defineLayout(({ children }) => (
  <>
    <header class="marketing-header">
      <a class="marketing-brand" href="/"><StarsMinimalisticIcon size={25} label="Northstar" /> <span>Northstar</span></a>
      <nav aria-label="Primary navigation"><a href="#features">Features</a><a href="#results">Results</a><a href="#contact">Contact</a></nav>
      <a class="header-cta" href="#contact">Start free</a>
    </header>
    {children}
  </>
));