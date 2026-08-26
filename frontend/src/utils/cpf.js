export function cpfDigits(value = '') {
  return value.replace(/\D/g, '').slice(0, 11)
}

export function formatCpf(value = '') {
  const digits = cpfDigits(value)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function isValidCpf(value = '') {
  const digits = cpfDigits(value)
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  const numbers = [...digits].map(Number)
  const calculateDigit = (length) => {
    const total = numbers
      .slice(0, length)
      .reduce((sum, number, index) => sum + number * (length + 1 - index), 0)
    const remainder = total % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  return numbers[9] === calculateDigit(9) && numbers[10] === calculateDigit(10)
}
