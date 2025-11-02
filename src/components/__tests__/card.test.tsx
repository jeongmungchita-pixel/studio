import { describe, it, expect } from 'vitest';
import { renderWithProviders } from './test-utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render with default styles', () => {
      const { container } = renderWithProviders(<Card>Card content</Card>);
      const card = container.querySelector('.rounded-lg.border');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Card content');
    });

    it('should accept custom className', () => {
      const { container } = renderWithProviders(
        <Card className="custom-card">Custom card</Card>
      );
      const card = container.querySelector('.custom-card');
      expect(card).toBeInTheDocument();
    });
  });

  describe('CardHeader', () => {
    it('should render header with proper spacing', () => {
      const { container } = renderWithProviders(
        <CardHeader>Header content</CardHeader>
      );
      const header = container.querySelector('.flex.flex-col.space-y-1.5.p-6');
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent('Header content');
    });
  });

  describe('CardTitle', () => {
    it('should render title with heading styles', () => {
      const { container } = renderWithProviders(
        <CardTitle>Card Title</CardTitle>
      );
      const title = container.querySelector('h3.text-2xl.font-semibold');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Card Title');
    });
  });

  describe('CardDescription', () => {
    it('should render description with muted text', () => {
      const { container } = renderWithProviders(
        <CardDescription>Card description</CardDescription>
      );
      const description = container.querySelector('.text-sm.text-muted-foreground');
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent('Card description');
    });
  });

  describe('CardContent', () => {
    it('should render content with proper padding', () => {
      const { container } = renderWithProviders(
        <CardContent>Card content</CardContent>
      );
      const content = container.querySelector('.p-6.pt-0');
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent('Card content');
    });
  });

  describe('CardFooter', () => {
    it('should render footer with flex layout', () => {
      const { container } = renderWithProviders(
        <CardFooter>Footer content</CardFooter>
      );
      const footer = container.querySelector('.flex.items-center.p-6.pt-0');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveTextContent('Footer content');
    });
  });

  it('should render complete card structure', () => {
    const { container } = renderWithProviders(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    );

    expect(container.querySelector('.rounded-lg.border')).toBeInTheDocument();
    expect(container.querySelector('h3')).toHaveTextContent('Test Title');
    expect(container.querySelector('.text-sm.text-muted-foreground')).toHaveTextContent('Test Description');
    expect(container.querySelector('.p-6.pt-0')).toHaveTextContent('Test Content');
    expect(container.querySelector('.flex.items-center.p-6.pt-0')).toHaveTextContent('Test Footer');
  });
});
