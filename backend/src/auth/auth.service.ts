import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultAdmin();
  }

  async seedDefaultAdmin() {
    try {
      const adminEmail = 'admin@assessment.local';
      const existing = await this.prisma.user.findUnique({
        where: { email: adminEmail },
      });

      if (!existing) {
        const hashedPassword = await bcrypt.hash('Admin123!', 10);
        await this.prisma.user.create({
          data: {
            email: adminEmail,
            password: hashedPassword,
            name: 'Assessment Admin',
            role: 'ADMIN',
          },
        });
        this.logger.log(`Default administrator seeded: ${adminEmail} / Admin123!`);
      }
    } catch (err) {
      this.logger.warn(`Could not seed default admin (DB may not be migrated yet): ${(err as Error).message}`);
    }
  }

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      return null;
    }

    const { password, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(name: string, email: string, pass: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(pass, 10);
    const created = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    const { password, ...safeUser } = created;
    return this.login(safeUser);
  }
}
