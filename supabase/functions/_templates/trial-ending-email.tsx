import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

interface TrialEndingEmailProps {
  fullName: string;
  daysLeft: number;
  planName: string;
  planPrice: string;
  manageSubscriptionUrl: string;
}

export const TrialEndingEmail = ({ 
  fullName, 
  daysLeft,
  planName,
  planPrice,
  manageSubscriptionUrl 
}: TrialEndingEmailProps) => (
  <Html>
    <Head />
    <Preview>{`Your Regimen trial ends in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your trial is ending soon</Heading>
        
        <Text style={text}>
          Hi {fullName},
        </Text>

        <Text style={text}>
          We hope you've been enjoying Regimen! Your 14-day free trial will end in <strong>{daysLeft} {daysLeft === 1 ? 'day' : 'days'}</strong>.
        </Text>

        <Section style={highlightSection}>
          <Text style={highlightText}>
            <strong>What happens next?</strong>
            <br /><br />
            Your {planName} subscription ({planPrice}) will begin automatically.
            <br /><br />
            You can cancel anytime before then to avoid being charged.
          </Text>
        </Section>

        <Section style={statsSection}>
          <Heading style={h2}>Your Progress So Far:</Heading>
          <Text style={statsText}>
            You've been building healthy habits with Regimen. Keep it up! 💪
          </Text>
        </Section>

        <Section style={ctaSection}>
          <Link
            href={manageSubscriptionUrl}
            style={button}
          >
            Manage Subscription
          </Link>
        </Section>

        <Text style={text}>
          Have questions? We're here to help. Just reply to this email.
        </Text>

        <Text style={footer}>
          Thank you for choosing Regimen,
          <br />
          The Regimen Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default TrialEndingEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  maxWidth: '600px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  lineHeight: '1.3',
}

const h2 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const highlightSection = {
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#d4edda',
  borderRadius: '8px',
  borderLeft: '4px solid #28a745',
}

const highlightText = {
  color: '#155724',
  fontSize: '15px',
  lineHeight: '1.8',
  margin: '0',
}

const statsSection = {
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
}

const statsText = {
  color: '#484848',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
}

const ctaSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#8B5CF6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const footer = {
  color: '#8a8a8a',
  fontSize: '14px',
  lineHeight: '1.6',
  marginTop: '32px',
}
