import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/login-form'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock the auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

const mockRouter = {
  push: jest.fn(),
}

const mockSearchParams = {
  get: jest.fn(),
}

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(require('next/navigation').useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  })

  it('renders login form correctly', () => {
    const { useAuth } = require('@/lib/auth-context')
    useAuth.mockReturnValue({ login: jest.fn() })
    render(<LoginForm />)

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('displays success message from URL parameters', () => {
    const { useAuth } = require('@/lib/auth-context')
    useAuth.mockReturnValue({ login: jest.fn() })
    mockSearchParams.get.mockReturnValue('Registration successful! Please login with your credentials.')

    render(<LoginForm />)

    expect(screen.getByText('Registration successful! Please login with your credentials.')).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const mockLogin = jest.fn().mockResolvedValue({})
    const { useAuth } = require('@/lib/auth-context')
    useAuth.mockReturnValue({ login: mockLogin })

    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('displays error message on login failure', async () => {
    const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'))
    const { useAuth } = require('@/lib/auth-context')
    useAuth.mockReturnValue({ login: mockLogin })

    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'wrongpassword')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('handles social login', async () => {
    const { useAuth } = require('@/lib/auth-context')
    useAuth.mockReturnValue({ login: jest.fn() })
    const mockSignIn = jest.fn()
    const { signIn } = require('next-auth/react')
    signIn.mockImplementation(mockSignIn)

    render(<LoginForm />)

    const googleButton = screen.getByRole('button', { name: /google/i })
    await userEvent.click(googleButton)

    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/' })
  })

  it('shows loading state during submission', async () => {
    const mockLogin = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    const { useAuth } = require('@/lib/auth-context')
    useAuth.mockReturnValue({ login: mockLogin })

    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(submitButton)

    expect(screen.getByText('Signing in...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled()
    })
  })
})
