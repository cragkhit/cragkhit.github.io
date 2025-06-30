
class Rational {
	long numerator, denominator;

	class Illegal extends Exception {
		String reason;

		Illegal(String reason) {
			this.reason = reason;
		}
	}

	Rational() {
		// ...
	}

	Rational(long numerator, long denominator) throws Illegal {
		// ...
	}

	// find the reduce form
	private void simplestForm() {
		long computeGCD;
		computeGCD = GCD(Math.abs(numerator), denominator);
		numerator /= computeGCD;
		denominator /= computeGCD;
	}

	// find the greatest common denominator
	private long GCD(long a, long b) {
		if (a % b == 0)
			return b;
		else
			return GCD(b, a % b);
	}

	public void add(Rational x) {
		numerator = (numerator * x.denominator) + (x.numerator * denominator);
		denominator = (denominator * x.denominator);
		simplestForm();
	}

	public void subtract(Rational x) {
		// ...
	}

	public void multiply(Rational x) {
		// ...
	}

	public void divide(Rational x) {
		// ...
	}

	public boolean equals(Object x) {
		/* TODO: Fix the return statement below. */
		return true;
	}

	public long compareTo(Object x) {
		/* TODO: Fix the return statement below. */
		return 0;
	}

	public String toString() {
		/* TODO: Fix the return statement below. */
		return "something";
	}
}
