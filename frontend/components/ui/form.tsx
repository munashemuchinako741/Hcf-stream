'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { Slot } from '@radix-ui/react-slot'

// Import the whole module and treat it as "any" to avoid version/type mismatch issues
import * as ReactHookForm from 'react-hook-form'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

const RHF: any = ReactHookForm

// Use FormProvider from react-hook-form if it exists, otherwise a passthrough
const Form: React.ComponentType<any> =
  (RHF && RHF.FormProvider) || ((props: any) => <form {...props} />)

type FormFieldContextValue = {
  name: string
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
)

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
)

type FormFieldProps = {
  name: string
  defaultValue?: any
  rules?: any
  control?: any
  disabled?: boolean
  shouldUnregister?: boolean
  render: (args: {
    field: any
    fieldState: any
    formState: any
  }) => React.ReactNode
}

// Internal controller that works with whatever RHF version is present
function InternalController(props: FormFieldProps) {
  const methods = RHF.useFormContext ? RHF.useFormContext() : {}
  const control = props.control ?? methods.control

  let field = {}
  let fieldState = {}
  let formState = methods.formState ?? {}

  if (RHF.useController && control) {
    // RHF v7+ style
    const result = RHF.useController({
      name: props.name,
      control,
      rules: props.rules,
      defaultValue: props.defaultValue,
      disabled: props.disabled,
      shouldUnregister: props.shouldUnregister,
    })
    field = result.field
    fieldState = result.fieldState
    formState = result.formState
  } else if (methods.register) {
    // Fallback for older versions: emulate "field" using register
    const reg = methods.register(props.name, props.rules) || {}
    field = {
      ...reg,
      name: props.name,
      disabled: props.disabled,
    }
    // Try to get fieldState if getFieldState exists
    if (methods.getFieldState) {
      fieldState = methods.getFieldState(props.name, methods.formState)
    }
  }

  return <>{props.render({ field, fieldState, formState })}</>
}

const FormField = (props: FormFieldProps) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <InternalController {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>')
  }

  const methods = RHF.useFormContext ? RHF.useFormContext() : {}
  const getFieldState =
    methods.getFieldState ||
    ((name: string) => {
      const errors = methods.formState?.errors || {}
      return { error: errors[name] }
    })

  const fieldState = getFieldState(fieldContext.name, methods.formState)
  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn('grid gap-2', className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn('data-[error=true]:text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function FormMessage({ className, ...props }: React.ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? '') : props.children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn('text-destructive text-sm', className)}
      {...props}
    >
      {body}
    </p>
  )
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
