import re


def normalize_cpf(value: str) -> str:
    return re.sub(r"\D", "", value)


def is_valid_cpf(value: str) -> bool:
    digits = normalize_cpf(value)
    if len(digits) != 11 or len(set(digits)) == 1:
        return False

    numbers = [int(digit) for digit in digits]
    first_total = sum(
        number * weight
        for number, weight in zip(numbers[:9], range(10, 1, -1), strict=True)
    )
    first_digit = 0 if first_total % 11 < 2 else 11 - (first_total % 11)
    second_total = sum(
        number * weight
        for number, weight in zip(numbers[:10], range(11, 1, -1), strict=True)
    )
    second_digit = 0 if second_total % 11 < 2 else 11 - (second_total % 11)
    return numbers[9:] == [first_digit, second_digit]
