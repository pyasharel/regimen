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
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PaymentFailedEmailProps {
  fullName: string;
  amount: string;
  currency: string;
  invoiceUrl: string;
  updatePaymentUrl: string;
}

export const PaymentFailedEmail = ({ 
  fullName, 
  amount, 
  currency,
  invoiceUrl,
  updatePaymentUrl 
}: PaymentFailedEmailProps) => (
  <Html>
    <Head />
    <Preview>Action Required: Payment for your Regimen subscription failed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment Failed</Heading>
        
        <Text style={text}>
          Hi {fullName},
        </Text>

        <Text style={text}>
          We were unable to process your payment of {currency.toUpperCase()} {amount} for your Regimen subscription.
        </Text>

        <Section style={alertSection}>
          <Text style={alertText}>
            <strong>What happens next?</strong>
            <br /><br />
            • Your subscription will remain active for a limited time
            <br />
            • We'll retry the payment automatically
            <br />
            • If payment continues to fail, your access may be suspended
          </Text>
        </Section>

        <Text style={text}>
          To avoid any interruption to your service, please update your payment method:
        </Text>

        <Section style={ctaSection}>
          <Link
            href={updatePaymentUrl}
            style={button}
          >
            Update Payment Method
          </Link>
        </Section>

        <Text style={linkText}>
          Or view your invoice:{' '}
          <Link href={invoiceUrl} style={link}>
            View Invoice
          </Link>
        </Text>

        <Section style={helpSection}>
          <Text style={helpText}>
            <strong>Common reasons for payment failure:</strong>
            <br /><br />
            • Insufficient funds
            <br />
            • Expired card
            <br />
            • Card blocked for international transactions
            <br />
            • Incorrect billing information
          </Text>
        </Section>

        <Text style={text}>
          If you have any questions or need assistance, please don't hesitate to reach out.
        </Text>

        <Text style={footer}>
          We're here to help,
          <br />
          The Regimen Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PaymentFailedEmail

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
  color: '#dc3545',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  lineHeight: '1.3',
}

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const alertSection = {
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#f8d7da',
  borderRadius: '8px',
  borderLeft: '4px solid #dc3545',
}

const alertText = {
  color: '#721c24',
  fontSize: '14px',
  lineHeight: '1.8',
  margin: '0',
}

const ctaSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#dc3545',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const linkText = {
  color: '#484848',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '16px 0',
}

const link = {
  color: '#8B5CF6',
  textDecoration: 'underline',
}

const helpSection = {
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
}

const helpText = {
  color: '#484848',
  fontSize: '14px',
  lineHeight: '1.8',
  margin: '0',
}

const footer = {
  color: '#8a8a8a',
  fontSize: '14px',
  lineHeight: '1.6',
  marginTop: '32px',
}
