// Mulberry32 Seeded Random Number Generator
// Deterministic RNG. Matches src/utils/rng.ts exactly.

pub struct SeededRNG {
    state: i32,
}

impl SeededRNG {
    pub fn new(seed: f64) -> Self {
        Self {
            state: seed as i32,
        }
    }

    pub fn reseed(&mut self, seed: f64) {
        self.state = seed as i32;
    }

    pub fn next_float(&mut self) -> f64 {
        self.state = self.state.wrapping_add(0x6d2b79f5_u32 as i32);
        
        let state_u = self.state as u32;
        let t1 = self.state ^ ((state_u >> 15) as i32);
        let mut t = t1.wrapping_mul(1 | self.state);
        
        let t_u = t as u32;
        let t2 = t ^ ((t_u >> 7) as i32);
        t = (t.wrapping_add(t2.wrapping_mul(61 | t))) ^ t;
        
        let t_u2 = t as u32;
        let final_val = t_u2 ^ (t_u2 >> 14);
        (final_val as f64) / 4294967296.0
    }

    pub fn next_int(&mut self, max: i32) -> i32 {
        if max <= 0 {
            return 0;
        }
        (self.next_float() * (max as f64)).floor() as i32
    }

    pub fn next(&mut self) -> i32 {
        (self.next_float() * 2147483647.0).floor() as i32
    }

    pub fn shuffle<T>(&mut self, array: &mut [T]) {
        let len = array.len();
        if len <= 1 {
            return;
        }
        for i in (1..len).rev() {
            let j = self.next_int((i + 1) as i32) as usize;
            array.swap(i, j);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rng_determinism() {
        let mut rng = SeededRNG::new(42.0);
        let expected = [
            0.6011037519201636,
            0.44829055899754167,
            0.8524657934904099,
            0.6697340414393693,
            0.17481389874592423,
        ];
        for &val in expected.iter() {
            let actual = rng.next_float();
            assert!((actual - val).abs() < 1e-15, "Expected {}, got {}", val, actual);
        }
    }
}
