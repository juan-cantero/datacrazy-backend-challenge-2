import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PessoaService } from './pessoa.service';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import { PessoaResponseDto } from './dto/pessoa-response.dto';

/**
 * REST Controller for Pessoa entity.
 *
 * Provides HTTP endpoints for:
 * - CRUD operations
 * - Search by email (with intelligent caching)
 * - Search by telefone (with intelligent caching)
 * - Search by name
 *
 * Architecture: HTTP Request → Controller → Service → (Cache + DAO) → Database
 */
@ApiTags('Pessoas')
@Controller('pessoas')
export class PessoaController {
  constructor(private readonly pessoaService: PessoaService) {}

  /**
   * Create a new Pessoa record.
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new Pessoa',
    description:
      'Creates a new Pessoa record in the database. Automatically evicts cache entries for the new email and telefone.',
  })
  @ApiBody({ type: CreatePessoaDto })
  @ApiResponse({
    status: 201,
    description: 'Pessoa successfully created',
    type: PessoaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async create(@Body() createDto: CreatePessoaDto): Promise<PessoaResponseDto> {
    return this.pessoaService.create(createDto);
  }

  /**
   * Get a Pessoa by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get Pessoa by ID',
    description: 'Retrieves a Pessoa record by its unique identifier (UUID).',
  })
  @ApiParam({
    name: 'id',
    description: 'Pessoa UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ApiResponse({
    status: 200,
    description: 'Pessoa found',
    type: PessoaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Pessoa not found',
  })
  async getById(@Param('id') id: string): Promise<PessoaResponseDto> {
    return this.pessoaService.findById(id);
  }

  /**
   * Find Pessoa by email (uses native SQL with caching).
   */
  @Get('email/:email')
  @ApiOperation({
    summary: 'Find Pessoa by email (with cache)',
    description:
      'Searches for a Pessoa by email using native SQL query. Results are cached with SHA256 key for 5 minutes. Demonstrates cache HIT/MISS behavior in console logs.',
  })
  @ApiParam({
    name: 'email',
    description: 'Email address to search',
    example: 'joao.silva@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Pessoa found (check console for cache HIT/MISS)',
    type: PessoaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Pessoa not found',
  })
  async findByEmail(@Param('email') email: string): Promise<PessoaResponseDto> {
    return this.pessoaService.findByEmail(email);
  }

  /**
   * Find Pessoa by telefone (uses native SQL with caching).
   */
  @Get('telefone/:telefone')
  @ApiOperation({
    summary: 'Find Pessoa by telefone (with cache)',
    description:
      'Searches for a Pessoa by phone number using native SQL query. Results are cached with SHA256 key for 5 minutes. Demonstrates cache HIT/MISS behavior in console logs.',
  })
  @ApiParam({
    name: 'telefone',
    description: 'Phone number to search',
    example: '(11) 98765-4321',
  })
  @ApiResponse({
    status: 200,
    description: 'Pessoa found (check console for cache HIT/MISS)',
    type: PessoaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Pessoa not found',
  })
  async findByTelefone(
    @Param('telefone') telefone: string,
  ): Promise<PessoaResponseDto> {
    return this.pessoaService.findByTelefone(telefone);
  }

  /**
   * Search Pessoa by name (partial match, case-insensitive).
   */
  @Get('search/by-name')
  @ApiOperation({
    summary: 'Search Pessoas by name',
    description:
      'Searches for Pessoas by name using case-insensitive partial match (ILIKE). Returns all matching records.',
  })
  @ApiQuery({
    name: 'nome',
    description: 'Name or partial name to search',
    example: 'João',
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching Pessoas (may be empty)',
    type: [PessoaResponseDto],
  })
  async findByName(@Query('nome') nome: string): Promise<PessoaResponseDto[]> {
    return this.pessoaService.findByName(nome);
  }

  /**
   * Update an existing Pessoa record.
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update Pessoa',
    description:
      'Updates an existing Pessoa record. Automatically evicts cache entries for both old and new email/telefone values.',
  })
  @ApiParam({
    name: 'id',
    description: 'Pessoa UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ApiBody({ type: UpdatePessoaDto })
  @ApiResponse({
    status: 200,
    description: 'Pessoa successfully updated',
    type: PessoaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Pessoa not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePessoaDto,
  ): Promise<PessoaResponseDto> {
    try {
      return await this.pessoaService.update(id, updateDto);
    } catch {
      throw new NotFoundException(`Pessoa with ID ${id} not found`);
    }
  }

  /**
   * Delete a Pessoa record.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete Pessoa',
    description:
      'Deletes a Pessoa record by ID. Automatically evicts related cache entries before deletion.',
  })
  @ApiParam({
    name: 'id',
    description: 'Pessoa UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ApiResponse({
    status: 204,
    description: 'Pessoa successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Pessoa not found',
  })
  async delete(@Param('id') id: string): Promise<void> {
    try {
      await this.pessoaService.delete(id);
    } catch {
      throw new NotFoundException(`Pessoa with ID ${id} not found`);
    }
  }
}
