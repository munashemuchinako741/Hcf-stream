import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '@/components/register-form'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock the auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    register: jest.fn(),
  }),
}))

const mockRouter = {
  push: jest.fn(),
}

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('renders registration form correctly', () => {
    render(<RegisterForm />)

    expect(screen.getByText('Sign up')).toBeInTheDocument()
    expect(screen.getByText('Create your account to get started')).toBeInTheDocument()
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  })

  it('validates password confirmation', async () => {
    render(<RegisterForm />)

    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const termsCheckbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    await userEvent.type(nameInput, 'Test User')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.type(confirmPasswordInput, 'differentpassword')
    await userEvent.click(termsCheckbox)

    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('validates terms agreement', async () => {
    render(<RegisterForm />)

    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    await userEvent.type(nameInput, 'Test User')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.type(confirmPasswordInput, 'password123')

    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('You must agree to the Terms of Service and Privacy Policy')).toBeInTheDocument()
    })
  })

  it('submits form successfully', async () => {
    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'User registered successfully' }),
      })
    ) as jest.Mock

    render(<RegisterForm />)

    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const termsCheckbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    await userEvent.type(nameInput, 'Test User')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.type(confirmPasswordInput, 'password123')
    await userEvent.click(termsCheckbox)

    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      })
    })

    expect(mockRouter.push).toHaveBeenCalledWith('/login?message=Registration successful! Please login with your credentials.')
  })

  it('handles registration failure', async () => {
    // Mock fetch to return error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Email already exists' }),
      })
    ) as jest.Mock

    render(<RegisterForm />)

    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const termsCheckbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    await userEvent.type(nameInput, 'Test User')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.type(confirmPasswordInput, 'password123')
    await userEvent.click(termsCheckbox)

    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })
  })

  it('handles rate limiting', async () => {
    // Mock fetch to return 429 status
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Too many attempts' }),
      })
    ) as jest.Mock

    render(<RegisterForm />)

    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const termsCheckbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    await userEvent.type(nameInput, 'Test User')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.type(confirmPasswordInput, 'password123')
    await userEvent.click(termsCheckbox)

    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Too many attempts')).toBeInTheDocument()
    })
  })

  it('handles network errors', async () => {
    // Mock fetch to throw error
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')))

    render(<RegisterForm />)

    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const termsCheckbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    await userEvent.type(nameInput, 'Test User')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.type(confirmPasswordInput, 'password123')
    await userEvent.click(termsCheckbox)

    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Unable to reach the server. Please try again.')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    // Mock fetch with delay
    global.fetch = jest.fn(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'User registered successfully' }),
        }), 100)
      )
    ) as jest.Mock

    render(<RegisterForm />)

    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const termsCheckbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    await userEvent.type(nameInput, 'Test User')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.type(confirmPasswordInput, 'password123')
    await userEvent.click(termsCheckbox)

    await userEvent.click(submitButton)

    expect(screen.getByText('Creating account...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalled()
    })
  })

  it('disables submit button when terms not agreed', () => {
    render(<RegisterForm />)

    const submitButton = screen.getByRole('button', { name: 'Create account' })
    expect(submitButton).toBeDisabled()
  })

  it('enables submit button when terms are agreed', async () => {
    render(<RegisterForm />)

    const termsCheckbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    await userEvent.click(termsCheckbox)

    expect(submitButton).not.toBeDisabled()
  })

  it('handles social signup buttons', () => {
    // Mock console.log to avoid console output in tests
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    render(<RegisterForm />)

    const googleButton = screen.getByRole('button', { name: /google/i })
    const facebookButton = screen.getByRole('button', { name: /facebook/i })

    fireEvent.click(googleButton)
    fireEvent.click(facebookButton)

    expect(consoleSpy).toHaveBeenCalledWith('Sign up with google')
    expect(consoleSpy).toHaveBeenCalledWith('Sign up with facebook')

    consoleSpy.mockRestore()
  })
})
