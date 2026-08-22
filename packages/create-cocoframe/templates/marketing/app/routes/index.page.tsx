import { definePage } from "@cocoframe/core";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import BoltIcon from "@cocoframe/icons/linear/bolt";
import GraphUpIcon from "@cocoframe/icons/linear/graph-up";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import { Badge, Card, Container, Heading, Inline, Stack, Stat, Text } from "@cocoframe/ui";

const features = [
  { icon: <BoltIcon size={22} />, title: "Launch faster", copy: "Ship a polished product page with server-rendered HTML and a tiny browser footprint." },
  { icon: <GraphUpIcon size={22} />, title: "Convert clearly", copy: "Guide visitors with focused sections, measurable proof, and accessible calls to action." },
  { icon: <ShieldCheckIcon size={22} />, title: "Stay reliable", copy: "Typed routes, secure defaults, and predictable files keep the project easy to maintain." },
];

export default definePage({
  meta: {
    title: "{{PROJECT_NAME}} — Marketing template",
    description: "A responsive, SEO-ready marketing template built with CocoFrame components.",
  },
  view: () => <main>
    <Container as="section" size="large" class="marketing-hero">
      <Stack gap="large" class="hero-copy">
        <Badge variant="success"><BoltIcon size={14} /> Built with CocoFrame</Badge>
        <Heading level={1} size="xlarge">Turn your next idea into a clear, fast product story.</Heading>
        <Text size="large" tone="muted">Northstar gives modern teams an SEO-ready foundation made from official CocoFrame components and Solar Linear icons.</Text>
        <Inline gap="medium"><a class="primary-link" href="#contact">Start building <ArrowRightIcon size={17} /></a><a class="secondary-link" href="#features">Explore features</a></Inline>
      </Stack>
      <Card class="hero-panel"><span class="panel-label">Weekly momentum</span><strong>+38%</strong><div class="spark-bars" aria-label="Growth chart"><i></i><i></i><i></i><i></i><i></i><i></i></div><small>More qualified product conversations</small></Card>
    </Container>

    <section id="features"><Container as="div" size="large" class="feature-section">
      <Stack gap="small" class="section-heading"><Badge variant="primary">Product foundation</Badge><Heading level={2}>Everything needed for a confident launch</Heading><Text tone="muted">Composable sections stay readable for developers, search engines, and AI coding assistants.</Text></Stack>
      <div class="feature-grid">{features.map((feature) => <Card class="feature-card"><span class="feature-icon">{feature.icon}</span><Heading level={3} size="medium">{feature.title}</Heading><Text tone="muted">{feature.copy}</Text></Card>)}</div>
    </Container></section>

    <section id="results"><Container as="div" size="large" class="results"><Stat label="Lighthouse-ready" value="100" trend="Semantic server HTML" tone="positive" /><Stat label="Browser runtime" value="Opt-in" trend="Islands only when needed" tone="positive" /><Stat label="Shared UI" value="80+" trend="Official primitives" tone="positive" /></Container></section>

    <section id="contact"><Container as="div" size="large" class="final-cta"><Stack gap="medium"><Badge variant="success">Ready when you are</Badge><Heading level={2}>Build the next version of your product today.</Heading><Text tone="muted">Replace this copy with your offer, connect the typed API, and deploy.</Text><a class="primary-link" href="mailto:hello@example.com">Talk to the team <ArrowRightIcon size={17} /></a></Stack></Container></section>
  </main>,
});