class SqrtAlgorithm {
    SqrtAlgorithm()
    {
        super();
    }
    
    public static double SqrtByAlogorithm(double d)
    {
        int i = 0;
        boolean b = false;
        int i0 = 0;
        RuntimeException a = null;
        long j = (long)d;
        long j0 = (long)((d - (double)j) * 1000000.0);
        long j1 = j;
        int i1 = 0;
        while(j1 >= 10L)
        {
            j1 = j1 / 10L;
            i1 = i1 + 1;
        }
        int i2 = i1 + 1;
        long j2 = j0;
        int i3 = 0;
        while(j2 >= 10L)
        {
            j2 = j2 / 10L;
            i3 = i3 + 1;
        }
        int i4 = i3 + 1;
        if (i2 % 2 != 1)
        {
            i = 0;
            b = false;
            i0 = 0;
        }
        else
        {
            i = 0;
            b = true;
            i0 = 0;
        }
        try
        {
            while(true)
            {
                int i5 = 0;
                if (b)
                {
                    i5 = i2 - 1;
                    b = true;
                }
                else
                {
                    i5 = i2 - 2;
                }
                int i6 = 1;
                int i7 = 0;
                while(i7 < i5)
                {
                    i6 = i6 * 10;
                    i7 = i7 + 1;
                }
                int i8 = (int)j / i6;
                int i9 = i * 2;
                int i10 = 1;
                while(true)
                {
                    double d0 = 0.0;
                    label7: {
                        label3: {
                            label6: {
                                label4: {
                                    label5: {
                                        if (i9 == 0)
                                        {
                                            break label5;
                                        }
                                        if (i8 - i10 * (i9 * 10 + i10) >= 0)
                                        {
                                            break label4;
                                        }
                                        break label6;
                                    }
                                    if (i8 - i10 * i10 < 0)
                                    {
                                        break label3;
                                    }
                                    i9 = 0;
                                }
                                i10 = i10 + 1;
                                continue;
                            }
                            i = i9 / 2 * 10 + i10 - 1;
                            break label7;
                        }
                        i = i10 - 1;
                    }
                    int i11 = i / 10;
                    int i12 = i % 10;
                    j = (i11 != 0) ? j - (long)((i11 * 2 * 10 + i12) * i12 * i6) : j - (long)(i * i * i6);
                    int i13 = (j < 0L) ? -1 : (j == 0L) ? 0 : 1;
                    label0: {
                        label2: {
                            if (i13 != 0)
                            {
                                break label2;
                            }
                            if (j0 != 0L)
                            {
                                break label2;
                            }
                            if (i5 <= 0)
                            {
                                break label0;
                            }
                            int i14 = i5 / 2;
                            int i15 = 1;
                            int i16 = 0;
                            while(i16 < i14)
                            {
                                i15 = i15 * 10;
                                i16 = i16 + 1;
                            }
                            i = i * i15;
                            break label0;
                        }
                        if (b)
                        {
                            i2 = i2 + -1;
                            b = false;
                        }
                        else
                        {
                            i2 = i2 + -2;
                        }
                        if (i2 > 0)
                        {
                            break;
                        }
                        int i17 = (j < 0L) ? -1 : (j == 0L) ? 0 : 1;
                        label1: {
                            if (i17 > 0)
                            {
                                break label1;
                            }
                            if (j0 <= 0L)
                            {
                                break label0;
                            }
                        }
                        if (i0 < 5)
                        {
                            i0 = i0 + 1;
                            j = j * 100L;
                            if (j0 > 0L)
                            {
                                i4 = i4 + -2;
                                int i18 = 1;
                                int i19 = 0;
                                while(i19 < i4)
                                {
                                    i18 = i18 * 10;
                                    i19 = i19 + 1;
                                }
                                j = j + j0 / (long)i18;
                                j0 = j0 % (long)i18;
                            }
                            i2 = i2 + 2;
                            break;
                        }
                    }
                    if (i0 != 0)
                    {
                        int i20 = 1;
                        int i21 = 0;
                        while(i21 < i0)
                        {
                            i20 = i20 * 10;
                            i21 = i21 + 1;
                        }
                        d0 = (double)i / (double)i20;
                    }
                    else
                    {
                        d0 = (double)i;
                    }
                    return d0;
                }
            }
        }
        catch(ArithmeticException | IllegalMonitorStateException a0)
        {
            a = a0;
        }
        throw a;
    }
    
    public static void main(String[] a)
    {
        double d = 0.0;
        while(d <= 10000.0)
        {
            System.out.print("sqrt(");
            System.out.print(d);
            System.out.print(") = ");
            System.out.print(SqrtAlgorithm.SqrtByAlogorithm(d));
            System.out.print(", ");
            System.out.println(Math.sqrt(d));
            d = d + 50.0;
        }
    }
}
